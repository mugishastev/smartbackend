import prisma from '../config/database';
import { config } from '../config';
import { EmailService } from './email.service';
import { OTPType } from '../lib/enums';

export class OTPService {
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static async createAndSendOTP(
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
    await prisma.oTP.deleteMany({
      where: {
        userId,
        type,
        used: false,
      },
    });

    // Create new OTP
    await prisma.oTP.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });

    // Send OTP email
    await EmailService.sendOTP(email, code, type);

    return code;
  }

  static async verifyOTP(userId: string, code: string, type: OTPType): Promise<boolean> {
    const otp = await prisma.oTP.findFirst({
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
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return true;
  }

  static async cleanupExpiredOTPs(): Promise<void> {
    await prisma.oTP.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}