import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApiError } from '../lib/ApiError';

export interface CreateConversationPayload {
  buyerId: string;
  cooperativeId: string;
  subject?: string;
  orderId?: string;
}

export interface SendChatMessagePayload {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService
  ) { }

  async ensureConversation(payload: CreateConversationPayload) {
    const existing = await this.prisma.chatConversation.findFirst({
      where: {
        buyerId: payload.buyerId,
        cooperativeId: payload.cooperativeId,
        orderId: payload.orderId,
      },
    });

    if (existing) return existing;

    return this.prisma.chatConversation.create({
      data: {
        buyerId: payload.buyerId,
        cooperativeId: payload.cooperativeId,
        subject: payload.subject,
        orderId: payload.orderId,
      },
    });
  }

  async listConversationsForUser(filter: {
    userId: string;
    role: string;
    cooperativeId?: string;
  }) {
    const whereClause = {
      OR: [
        { buyerId: filter.userId },
        filter.cooperativeId ? { cooperativeId: filter.cooperativeId } : undefined,
      ].filter(Boolean) as any[],
    };

    if (!whereClause.OR.length) {
      throw new ApiError(400, 'Unable to resolve conversations for this user');
    }

    return this.prisma.chatConversation.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });
  }

  async getConversationMessages(
    conversationId: string,
    options: { userId: string; role?: string; cooperativeId?: string }
  ) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    if (
      options.role !== 'SUPER_ADMIN' &&
      options.role !== 'RCA_REGULATOR' &&
      conversation.buyerId !== options.userId &&
      conversation.cooperativeId !== options.cooperativeId
    ) {
      throw new ApiError(403, 'Access denied to this conversation');
    }

    return conversation.messages;
  }

  async sendMessage(payload: SendChatMessagePayload) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: payload.conversationId },
      include: {
        buyer: true,
        cooperative: true,
      },
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const sender = await this.prisma.user.findUnique({
      where: { id: payload.senderId },
      select: { cooperativeId: true },
    });

    const isBuyer = payload.senderId === conversation.buyerId;
    const isCooperativeMember = !!(
      sender?.cooperativeId && sender.cooperativeId === conversation.cooperativeId
    );

    if (!isBuyer && !isCooperativeMember) {
      throw new ApiError(403, 'Sender not part of the conversation');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: { id: true, cooperativeId: true },
    });

    const receiverIsBuyer = receiver?.id === conversation.buyerId;
    const receiverIsCoop = receiver?.cooperativeId === conversation.cooperativeId;

    if (!receiver || (!receiverIsBuyer && !receiverIsCoop)) {
      throw new ApiError(400, 'Receiver is not part of this conversation');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        content: payload.content,
        attachments: payload.attachments || [],
      },
    });

    await this.prisma.chatConversation.update({
      where: { id: payload.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'ACTIVE',
      },
    });

    await this.notificationsService.sendChatNotification(
      payload.receiverId,
      payload.content,
      conversation.subject ?? 'New message'
    );

    return message;
  }
}

