import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';
import { NotificationService } from './notification.service';

export interface ConversationFilter {
  buyerId?: string;
  cooperativeId?: string;
  orderId?: string;
}

interface CreateConversationPayload {
  buyerId: string;
  cooperativeId: string;
  subject?: string;
  orderId?: string;
}

interface SendChatMessagePayload {
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  attachments?: string[];
}

export class ChatService {
  static async ensureConversation(payload: CreateConversationPayload) {
    const existing = await prisma.chatConversation.findFirst({
      where: {
        buyerId: payload.buyerId,
        cooperativeId: payload.cooperativeId,
        orderId: payload.orderId,
      },
    });

    if (existing) return existing;

    return prisma.chatConversation.create({
      data: {
        buyerId: payload.buyerId,
        cooperativeId: payload.cooperativeId,
        subject: payload.subject,
        orderId: payload.orderId,
      },
    });
  }

  static async listConversationsForUser(filter: {
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

    return prisma.chatConversation.findMany({
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

  static async getConversationMessages(
    conversationId: string,
    options: { userId: string; role?: string; cooperativeId?: string }
  ) {
    const conversation = await prisma.chatConversation.findUnique({
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

  static async sendMessage(payload: SendChatMessagePayload) {
    const conversation = await prisma.chatConversation.findUnique({
      where: { id: payload.conversationId },
      include: {
        buyer: true,
        cooperative: true,
      },
    });

    if (!conversation) {
      throw new ApiError(404, 'Conversation not found');
    }

    const sender = await prisma.user.findUnique({
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

    const receiver = await prisma.user.findUnique({
      where: { id: payload.receiverId },
      select: { id: true, cooperativeId: true },
    });

    const receiverIsBuyer = receiver?.id === conversation.buyerId;
    const receiverIsCoop = receiver?.cooperativeId === conversation.cooperativeId;

    if (!receiver || (!receiverIsBuyer && !receiverIsCoop)) {
      throw new ApiError(400, 'Receiver is not part of this conversation');
    }

    const message = await prisma.chatMessage.create({
      data: {
        conversationId: payload.conversationId,
        senderId: payload.senderId,
        content: payload.content,
        attachments: payload.attachments || [],
      },
    });

    await prisma.chatConversation.update({
      where: { id: payload.conversationId },
      data: {
        lastMessageAt: new Date(),
        status: 'ACTIVE',
      },
    });

    await NotificationService.sendChatNotification(
      payload.receiverId,
      payload.content,
      conversation.subject ?? 'New message'
    );

    return message;
  }

}

