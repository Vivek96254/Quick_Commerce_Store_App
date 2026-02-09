import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Post,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PushNotificationService } from '../../common/services/push-notification.service';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly pushService: PushNotificationService,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() body: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(userId, body);
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  // Admin endpoints
  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all users (Admin)' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: boolean,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.usersService.findAll({
      page,
      limit,
      search,
      role,
      isActive,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get user by ID (Admin)' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user status (Admin)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.usersService.updateStatus(id, body.isActive);
  }

  @Post('admin')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create admin user (Super Admin)' })
  async createAdmin(
    @Body() body: {
      email: string;
      phone?: string;
      password: string;
      firstName: string;
      lastName: string;
      role: 'ADMIN' | 'SUPER_ADMIN';
    },
  ) {
    return this.usersService.createAdmin(body);
  }

  // ─── Push Notification Tokens ─────────────────────────────────────

  @Post('push-token')
  @ApiOperation({ summary: 'Register push notification token' })
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      token: string;
      platform: 'fcm' | 'apns' | 'web';
      deviceId?: string;
    },
  ) {
    return this.pushService.registerToken({ userId, ...body });
  }

  @Delete('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove push notification token (logout / uninstall)' })
  async removePushToken(@Body() body: { token: string }) {
    await this.pushService.removeToken(body.token);
    return { message: 'Push token removed' };
  }
}
