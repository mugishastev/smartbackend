import { Injectable, UnauthorizedException, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import bcrypt from 'bcryptjs';
import { OTPService } from '../common/services/otp.service';
import { EmailService } from '../common/services/email.service';
import { OTPType } from '../lib/enums';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || UserRole.BUYER,
        isActive: false, // Wait for email verification
      },
    });

    try {
      await OTPService.createAndSendOTP(user.id, user.email, OTPType.REGISTRATION);
      return {
        message: 'Registration successful. OTP sent.',
      };
    } catch (emailError: any) {
      console.error('Email sending failed:', emailError);
      return {
        message: 'Registration successful. Please contact support to verify your email.',
      };
    }
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await OTPService.verifyOTP(user.id, dto.code, OTPType.REGISTRATION);

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isActive: true,
        emailVerified: true,
      },
    });

    try {
      await EmailService.sendWelcomeEmail(user.email, user.firstName);
    } catch (e) {
      console.error('Failed to send welcome email', e);
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      cooperativeId: user.cooperativeId,
    });

    return {
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        cooperativeId: user.cooperativeId,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is not active. Please verify your email.');
    }

    if (user.role === UserRole.COOP_ADMIN && user.cooperative?.status === 'PENDING') {
      throw new ForbiddenException('Your cooperative is still under review.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
      cooperativeId: user.cooperativeId,
    });

    // Fire and forget logging
    this.prisma.activityLog.create({
      data: {
        userId: user.id,
        cooperativeId: user.cooperativeId,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
      },
    }).catch(console.error);

    return {
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        cooperative: user.cooperative,
      },
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a password reset code has been sent.' };
    }

    await OTPService.createAndSendOTP(user.id, email, OTPType.PASSWORD_RESET);
    return { message: 'Password reset code sent to your email.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await OTPService.verifyOTP(user.id, dto.code, OTPType.PASSWORD_RESET);

    if (!isValid) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Password reset successful' };
  }

  async resendOtp(email: string, type: OTPType = OTPType.REGISTRATION) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await OTPService.createAndSendOTP(user.id, email, type);
    return { message: 'OTP sent successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        cooperativeId: true,
        cooperative: {
          select: {
            id: true,
            name: true,
            logo: true,
            status: true,
          },
        },
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
      },
    });

    return { message: 'Profile updated successfully', user };
  }

  async changePassword(userId: string, dto: ChangePasswordDto, cooperativeId?: string | null) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    this.prisma.activityLog.create({
      data: {
        userId: user.id,
        cooperativeId: cooperativeId,
        action: 'PASSWORD_CHANGED',
        entity: 'USER',
        entityId: user.id,
      },
    }).catch(console.error);

    return { message: 'Password changed successfully' };
  }
}
