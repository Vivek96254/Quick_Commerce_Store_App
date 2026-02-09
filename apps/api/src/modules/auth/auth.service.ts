import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../users/users.service';
import { LoggerService } from '../../common/services/logger.service';
import type { 
  LoginInput, 
  RegisterInput, 
  AuthTokens,
  SendOtpInput,
  VerifyOtpInput,
} from '@quickmart/shared-types';

interface JwtPayload {
  sub: string;
  email: string | null;
  phone: string | null;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly logger: LoggerService,
  ) {}

  async login(input: LoginInput) {
    const { email, phone, password } = input;

    const user = await this.db.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokens(user);

    this.logger.audit('USER_LOGIN', user.id, { email: user.email, phone: user.phone });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  async register(input: RegisterInput) {
    const { email, phone, password, firstName, lastName } = input;

    // Check if user exists
    const existingUser = await this.db.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.db.user.create({
      data: {
        email,
        phone,
        passwordHash,
        firstName,
        lastName,
        role: 'CUSTOMER',
        isEmailVerified: false,
        isPhoneVerified: false,
      },
    });

    // Create empty cart for new user
    await this.db.cart.create({
      data: { userId: user.id },
    });

    const tokens = await this.generateTokens(user);

    this.logger.audit('USER_REGISTER', user.id, { email, phone });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  async sendOtp(input: SendOtpInput) {
    const { email, phone, purpose } = input;

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Find or create user for verification purposes
    let user = await this.db.user.findFirst({
      where: {
        OR: [
          email ? { email } : {},
          phone ? { phone } : {},
        ].filter(condition => Object.keys(condition).length > 0),
      },
    });

    if (purpose === 'LOGIN' && !user) {
      throw new BadRequestException('User not found');
    }

    // Store OTP
    await this.db.otpCode.create({
      data: {
        code,
        userId: user?.id,
        email,
        phone,
        purpose,
        expiresAt,
      },
    });

    // In production, send OTP via SMS/Email
    // For development, log it
    this.logger.log(`OTP for ${email || phone}: ${code}`, 'AuthService');

    // TODO: Integrate Twilio for SMS or SendGrid for email

    return { message: 'OTP sent successfully', expiresIn: 300 };
  }

  async verifyOtp(input: VerifyOtpInput) {
    const { email, phone, code, purpose } = input;

    const otpRecord = await this.db.otpCode.findFirst({
      where: {
        OR: [
          email ? { email, code, purpose } : {},
          phone ? { phone, code, purpose } : {},
        ].filter(condition => Object.keys(condition).length > 0),
        expiresAt: { gt: new Date() },
        usedAt: null,
        attempts: { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark OTP as used
    await this.db.otpCode.update({
      where: { id: otpRecord.id },
      data: { usedAt: new Date() },
    });

    // Handle different purposes
    if (purpose === 'LOGIN') {
      const user = await this.db.user.findFirst({
        where: {
          OR: [
            email ? { email } : {},
            phone ? { phone } : {},
          ].filter(condition => Object.keys(condition).length > 0),
        },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Update verification status
      await this.db.user.update({
        where: { id: user.id },
        data: {
          ...(phone && { isPhoneVerified: true }),
          ...(email && { isEmailVerified: true }),
          lastLoginAt: new Date(),
        },
      });

      const tokens = await this.generateTokens(user);

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      };
    }

    return { verified: true };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if refresh token is in database and not revoked
      const storedToken = await this.db.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.sub,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!storedToken || !storedToken.user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // ── Family-based reuse detection ──────────────────────────
      // If the token was already revoked, someone is replaying it.
      // Revoke the *entire* family to force re-login on every device.
      if (storedToken.revokedAt) {
        this.logger.warn(
          `Refresh-token reuse detected for user ${payload.sub}, family ${storedToken.family}`,
          'AuthService',
        );

        if (storedToken.family) {
          await this.db.refreshToken.updateMany({
            where: { family: storedToken.family, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }

        throw new UnauthorizedException(
          'Token reuse detected — all sessions revoked. Please log in again.',
        );
      }

      // Revoke old refresh token (mark it used)
      await this.db.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      // Generate new tokens (same family)
      const tokens = await this.generateTokens(
        storedToken.user,
        storedToken.family || undefined,
      );

      return { tokens };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Revoke specific token
      await this.db.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all tokens
      await this.db.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    this.logger.audit('USER_LOGOUT', userId);

    return { message: 'Logged out successfully' };
  }

  private async generateTokens(
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      role: string;
    },
    existingFamily?: string,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn:
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Store refresh token with family for rotation detection
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const expiresAt = new Date(
      Date.now() + this.parseExpiresIn(refreshExpiresIn),
    );
    const family = existingFamily || nanoid(16);

    await this.db.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        family,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn:
        this.parseExpiresIn(
          this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
        ) / 1000,
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 15 * 60 * 1000; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * (multipliers[unit] || 60 * 1000);
  }

  async validateUser(userId: string) {
    try {
      return await this.usersService.findById(userId);
    } catch (error) {
      // Return null if user not found instead of throwing
      // This allows JWT strategy to handle it gracefully
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }
}
