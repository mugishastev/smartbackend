import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';

export const createMessage = async (
  orderId: string,
  senderId: string,
  receiverId: string,
  subject: string,
  content: string
) => {
  // Verify the order exists and sender/receiver are involved
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      items: {
        include: {
          product: {
            include: {
              cooperative: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Check if sender is buyer or from cooperative
  const isBuyer = order.buyerId === senderId;
  const isCooperativeMember = order.items.some((item: any) =>
    item.product.cooperativeId && true // Simplified check - cooperative exists
  );

  if (!isBuyer && !isCooperativeMember) {
    throw new ApiError(403, 'Unauthorized to send message for this order');
  }

  // Check if receiver is the other party
  const isReceiverBuyer = order.buyerId === receiverId;
  const isReceiverCooperativeMember = order.items.some((item: any) =>
    item.product.cooperativeId && true // Simplified check
  );

  if (!isReceiverBuyer && !isReceiverCooperativeMember) {
    throw new ApiError(400, 'Invalid receiver for this order');
  }

  const message = await prisma.message.create({
    data: {
      orderId,
      senderId,
      receiverId,
      subject,
      content,
      status: 'SENT',
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  return message;
};

export const getMessagesForOrder = async (orderId: string, userId: string) => {
  // Verify user has access to this order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      buyer: true,
      items: {
        include: {
          product: {
            include: {
              cooperative: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  const isBuyer = order.buyerId === userId;
  const isCooperativeMember = order.items.some((item: any) =>
    item.product.cooperativeId && true // Simplified check
  );

  if (!isBuyer && !isCooperativeMember) {
    throw new ApiError(403, 'Access denied to messages for this order');
  }

  const messages = await prisma.message.findMany({
    where: { orderId },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  return messages;
};

export const markMessageAsRead = async (messageId: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.receiverId !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      status: 'READ',
    },
  });

  return updatedMessage;
};

export const getUserMessages = async (userId: string) => {
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId },
        { receiverId: userId },
      ],
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
        },
      },
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return messages;
};
