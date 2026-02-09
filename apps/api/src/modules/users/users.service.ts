import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { Prisma } from '@quickmart/db';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async findById(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        adminRole: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.db.user.findUnique({
      where: { email },
    });
  }

  async findByPhone(phone: string) {
    return this.db.user.findUnique({
      where: { phone },
    });
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    // Ensure page and limit are valid numbers
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(params.limit) || 20));
    const {
      search,
      role,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
      ...(role && { role: role as any }),
      ...(isActive !== undefined && { isActive }),
    };

    const [items, total] = await Promise.all([
      this.db.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.db.user.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async updateProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) {
    // Check for conflicts
    if (data.email) {
      const existing = await this.db.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    if (data.phone) {
      const existing = await this.db.user.findFirst({
        where: { phone: data.phone, NOT: { id: userId } },
      });
      if (existing) {
        throw new ConflictException('Phone already in use');
      }
    }

    const user = await this.db.user.update({
      where: { id: userId },
      data: {
        ...data,
        ...(data.email && { isEmailVerified: false }),
        ...(data.phone && { isPhoneVerified: false }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
      },
    });

    return user;
  }

  async updateStatus(userId: string, isActive: boolean) {
    return this.db.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    });
  }

  async createAdmin(data: {
    email: string;
    phone?: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
  }) {
    const existing = await this.db.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.phone ? [{ phone: data.phone }] : []),
        ],
      },
    });

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    return this.db.user.create({
      data: {
        email: data.email,
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: true,
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
  }
}
