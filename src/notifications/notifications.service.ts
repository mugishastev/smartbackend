import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { EmailService } from '../services/email.service';
import { config } from '../config';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) { }

  async createNotification(params: {
    recipientId: string;
    type: 'CHAT_MESSAGE' | 'PROMOTION' | 'SYSTEM';
    title: string;
    description?: string;
    payload?: Record<string, any>;
  }) {
    const { recipientId, type, title, description, payload } = params;
    try {
      return await this.prisma.notification.create({
        data: {
          recipientId,
          type,
          title,
          description,
          payload,
        },
      });
    } catch (error) {
      throw new ApiError(500, 'Failed to persist notification');
    }
  }

  async sendChatNotification(recipientId: string, message: string, context?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: {
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw new ApiError(404, 'Notification recipient not found');
    }

    const title = context ? `New chat update: ${context}` : 'New chat message';
    await this.createNotification({
      recipientId,
      type: 'CHAT_MESSAGE',
      title,
      description: message,
      payload: { context },
    });

    if (user.email) {
      try {
        await EmailService.sendNotificationEmail(
          user.email,
          title,
          `<p>Hi ${user.firstName},</p><p>${message}</p><p>Log in to continue the conversation.</p>`
        );
      } catch (error) {
        console.warn('Failed to send chat email notification', error);
      }
    }

    if (user.phone) {
      this.sendSms(user.phone, `${title}: ${message}`);
    }
  }

  private sendSms(phone: string, body: string) {
    if (!config.notifications?.smsProviderUrl) {
      console.info('SMS skipped (not configured)', phone, body);
      return;
    }
    // Placeholder - integrate with actual SMS provider here
    console.info(`Sending SMS to ${phone}: ${body}`);
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }
}
