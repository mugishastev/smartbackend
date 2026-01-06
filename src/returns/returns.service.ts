import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';

@Injectable()
export class ReturnService {
  constructor(private readonly prisma: PrismaService) { }

  async createReturnRequest(
    buyerId: string,
    orderId: string,
    productId: string,
    orderItemId: string | null,
    reason: string,
    description?: string,
    images?: string[]
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.buyerId !== buyerId) {
      throw new ApiError(403, 'You can only return items from your own orders');
    }

    const daysSinceDelivery = order.status === 'DELIVERED'
      ? Math.floor((Date.now() - order.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      : -1;

    if (order.status !== 'DELIVERED') {
      throw new ApiError(400, 'You can only return items from delivered orders');
    }

    if (daysSinceDelivery > 30) {
      throw new ApiError(400, 'Return period has expired. Returns must be requested within 30 days of delivery');
    }

    const orderItem = order.items.find(
      item => item.productId === productId && (orderItemId ? item.id === orderItemId : true)
    );

    if (!orderItem) {
      throw new ApiError(404, 'Product not found in this order');
    }

    const existingReturn = await this.prisma.returnRequest.findFirst({
      where: {
        orderId,
        productId,
        orderItemId: orderItemId || orderItem.id,
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
    });

    if (existingReturn) {
      throw new ApiError(400, 'A return request already exists for this item');
    }

    const refundAmount = orderItem.subtotal;

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        orderId,
        buyerId,
        productId,
        orderItemId: orderItemId || orderItem.id,
        reason,
        description,
        images: images || [],
        status: 'PENDING',
        refundAmount,
        refundMethod: order.paymentMethod,
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            images: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
          },
        },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: buyerId,
        action: 'RETURN_REQUESTED',
        entity: 'RETURN_REQUEST',
        entityId: returnRequest.id,
        details: {
          orderId,
          productId,
          reason,
          refundAmount,
        },
      },
    });

    return returnRequest;
  }

  async getReturnRequests(
    userId: string,
    role: string,
    cooperativeId?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (role === 'BUYER') {
      where.buyerId = userId;
    } else if (cooperativeId && (role === 'COOP_ADMIN' || role === 'SECRETARY')) {
      where.product = { cooperativeId };
    }

    const [returns, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              cooperative: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
            },
          },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return {
      returns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getReturnRequestById(returnId: string, userId: string, role: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        product: {
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                district: true,
              },
            },
          },
        },
        order: {
          include: {
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!returnRequest) {
      throw new ApiError(404, 'Return request not found');
    }

    if (role === 'BUYER' && returnRequest.buyerId !== userId) {
      throw new ApiError(403, 'Access denied');
    }

    return returnRequest;
  }

  async approveReturn(
    returnId: string,
    processedBy: string,
    role: string,
    cooperativeId?: string
  ) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        product: {
          include: { cooperative: true },
        },
        order: true,
      },
    });

    if (!returnRequest) {
      throw new ApiError(404, 'Return request not found');
    }

    if (returnRequest.status !== 'PENDING') {
      throw new ApiError(400, `Return request is already ${returnRequest.status}`);
    }

    if (role !== 'COOP_ADMIN' && role !== 'SECRETARY' && role !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'Not authorized to approve returns');
    }

    if (role !== 'SUPER_ADMIN') {
      if (!cooperativeId || returnRequest.product.cooperativeId !== cooperativeId) {
        throw new ApiError(403, 'Not authorized to approve returns for this cooperative');
      }
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'APPROVED',
        processedBy,
        processedAt: new Date(),
      },
      include: {
        buyer: true,
        product: true,
        order: true,
      },
    });

    const orderItem =
      returnRequest.orderItemId
        ? await this.prisma.orderItem.findUnique({
          where: { id: returnRequest.orderItemId },
          select: { quantity: true },
        })
        : null;

    const restockQuantity = orderItem?.quantity || 1;

    await this.prisma.product.update({
      where: { id: returnRequest.productId },
      data: {
        availableStock: { increment: restockQuantity },
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: processedBy,
        cooperativeId: returnRequest.product.cooperativeId,
        action: 'RETURN_APPROVED',
        entity: 'RETURN_REQUEST',
        entityId: returnId,
        details: {
          refundAmount: returnRequest.refundAmount,
          productId: returnRequest.productId,
        },
      },
    });

    return updatedReturn;
  }

  async rejectReturn(
    returnId: string,
    processedBy: string,
    rejectionReason: string,
    role: string
  ) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new ApiError(404, 'Return request not found');
    }

    if (returnRequest.status !== 'PENDING') {
      throw new ApiError(400, `Return request is already ${returnRequest.status}`);
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'REJECTED',
        processedBy,
        processedAt: new Date(),
        rejectionReason,
      },
      include: {
        buyer: true,
        product: true,
        order: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: processedBy,
        action: 'RETURN_REJECTED',
        entity: 'RETURN_REQUEST',
        entityId: returnId,
        details: { rejectionReason },
      },
    });

    return updatedReturn;
  }

  async processRefund(
    returnId: string,
    refundRef: string,
    processedBy: string
  ) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new ApiError(404, 'Return request not found');
    }

    if (returnRequest.status !== 'APPROVED') {
      throw new ApiError(400, 'Return must be approved before processing refund');
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'REFUNDED',
        refundRef,
        processedBy,
        processedAt: new Date(),
      },
      include: {
        buyer: true,
        product: true,
        order: true,
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: processedBy,
        action: 'REFUND_PROCESSED',
        entity: 'RETURN_REQUEST',
        entityId: returnId,
        details: {
          refundAmount: returnRequest.refundAmount,
          refundRef,
        },
      },
    });

    return updatedReturn;
  }

  async cancelReturn(returnId: string, userId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new ApiError(404, 'Return request not found');
    }

    if (returnRequest.buyerId !== userId) {
      throw new ApiError(403, 'You can only cancel your own return requests');
    }

    if (!['PENDING', 'APPROVED'].includes(returnRequest.status)) {
      throw new ApiError(400, 'Cannot cancel return request in current status');
    }

    const updatedReturn = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: 'CANCELLED',
      },
    });

    return updatedReturn;
  }
}


