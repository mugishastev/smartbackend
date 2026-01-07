import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { config } from '../../config';
import { EmailService } from './email.service';
import { OTPType } from '../../lib/enums';

@Injectable()
export class OTPService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService
  ) { }

  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createAndSendOTP(
    userId: string,
    email: string,
    type: OTPType
  ): Promise<string> {
    // Generate OTP
    const code = this.generateOTP();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + config.otp.expiryMinutes);

    // Delete any existing unused OTPs for this user and type
    await this.prisma.oTP.deleteMany({
      where: {
        userId,
        type,
        used: false,
      },
    });

    // Create new OTP
    await this.prisma.oTP.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });

    // Send OTP email
    await this.emailService.sendOTP(email, code, type);

    return code;
  }

  async verifyOTP(userId: string, code: string, type: OTPType): Promise<boolean> {
    const otp = await this.prisma.oTP.findFirst({
      where: {
        userId,
        code,
        type,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!otp) {
      return false;
    }

    // Mark OTP as used
    await this.prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return true;
  }

  async cleanupExpiredOTPs(): Promise<void> {
    await this.prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
