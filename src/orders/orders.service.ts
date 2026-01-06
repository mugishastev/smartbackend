import { Injectable, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentDto } from './dto/payment.dto';
import { RefundDto } from './dto/refund.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { User, UserRole, OrderStatus } from '@prisma/client';
import { PaymentMethod } from '../lib/enums';
import { paypackService } from '../common/services/paypack.service';
import { OTPType } from '../lib/enums';


export type ServiceUser = {
    id: string;
    email: string;
    role: UserRole | string;
    cooperativeId?: string | null;
};

@Injectable()
export class OrdersService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateOrderDto, user: ServiceUser, files: any[]) {
        const { items, shippingInfo, paymentMethod, notes, shippingMethod } = dto;
        let calculatedTotalAmount = 0;
        let totalShippingCost = 0;
        const orderItems: { productId: string; quantity: number; price: number; subtotal: number }[] = [];

        for (const item of items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
                select: {
                    id: true,
                    isActive: true,
                    availableStock: true,
                    price: true,
                    name: true,
                    shippingCost: true,
                },
            });

            if (!product || !product.isActive) {
                throw new BadRequestException(`Product ${item.productId} not found or inactive`);
            }

            if (product.availableStock < item.quantity) {
                throw new BadRequestException(`Insufficient stock for ${product.name}. Available: ${product.availableStock}`);
            }

            const subtotal = Number(product.price) * item.quantity;
            calculatedTotalAmount += subtotal;
            totalShippingCost += Number(product.shippingCost || 0);
            orderItems.push({ productId: product.id, quantity: item.quantity, price: product.price, subtotal });
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const finalTotalAmount = calculatedTotalAmount + totalShippingCost;

        return this.prisma.$transaction(async (tx) => {
            const order = await tx.order.create({
                data: {
                    orderNumber,
                    buyerId: user.id,
                    totalAmount: finalTotalAmount,
                    deliveryAddress: `${shippingInfo.fullName}, ${shippingInfo.phone}, ${shippingInfo.address}, ${shippingInfo.district}, ${shippingInfo.sector}${shippingInfo.deliveryNotes ? ` - ${shippingInfo.deliveryNotes}` : ''}`,
                    paymentMethod: paymentMethod || PaymentMethod.CASH_ON_DELIVERY,
                    notes,
                    status: OrderStatus.PENDING,
                    paymentStatus: 'PENDING',
                    shippingMethod: shippingMethod || null,
                    shippingCost: totalShippingCost,
                    items: { create: orderItems },
                },
                include: { items: { include: { product: true } } },
            });

            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { availableStock: { decrement: item.quantity } },
                });
            }

            await tx.activityLog.create({
                data: {
                    userId: user.id,
                    action: 'ORDER_CREATED',
                    entity: 'ORDER',
                    entityId: order.id,
                    details: { orderNumber, totalAmount: finalTotalAmount, itemCount: items.length },
                },
            });

            return { message: 'Order created successfully', order };
        });
    }

    async findAll(query: OrderQueryDto, user: ServiceUser) {
        const { status, page = 1, limit = 20 } = query;
        const where: any = {};

        if (user.role === UserRole.BUYER) {
            where.buyerId = user.id;
        } else if (user.cooperativeId) {
            where.items = {
                some: {
                    product: {
                        cooperativeId: user.cooperativeId,
                    },
                },
            };
        }

        if (status) where.status = status;

        const skip = (Number(page) - 1) * Number(limit);

        const [orders, total] = await Promise.all([
            this.prisma.order.findMany({
                where,
                skip,
                take: Number(limit),
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
                    items: {
                        include: {
                            product: {
                                include: {
                                    cooperative: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.order.count({ where }),
        ]);

        return {
            orders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async findOne(id: string, user: ServiceUser) {
        const order = await this.prisma.order.findUnique({
            where: { id },
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
            throw new NotFoundException('Order not found');
        }

        if (
            user.id !== order.buyerId &&
            user.role !== UserRole.SUPER_ADMIN &&
            !order.items.some((item) => item.product.cooperativeId === user.cooperativeId)
        ) {
            throw new ForbiddenException('Not authorized');
        }

        return { order };
    }

    async updateStatus(id: string, dto: UpdateOrderStatusDto, user: ServiceUser) {
        const { status } = dto;

        if (!user.cooperativeId && user.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Not authorized');
        }

        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Check if user's cooperative has products in this order
        const hasProducts = order.items.some(
            (item) => item.product.cooperativeId === user.cooperativeId
        );

        if (!hasProducts && user.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Not authorized');
        }

        const updateData: any = { status };

        if (status === OrderStatus.DELIVERED && order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
            updateData.paymentStatus = 'COMPLETED';
        }

        const updatedOrder = await this.prisma.order.update({
            where: { id },
            data: updateData,
        });

        await this.prisma.activityLog.create({
            data: {
                userId: user.id,
                cooperativeId: user.cooperativeId,
                action: 'ORDER_STATUS_UPDATED',
                entity: 'ORDER',
                entityId: id,
                details: { oldStatus: order.status, newStatus: status },
            },
        });

        return {
            message: 'Order status updated successfully',
            order: updatedOrder,
        };
    }

    async processPayment(id: string, dto: PaymentDto, user: ServiceUser) {
        const { phoneNumber } = dto;
        const order = await this.prisma.order.findUnique({ where: { id } });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.buyerId !== user.id) {
            throw new ForbiddenException('Not authorized');
        }

        if (order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PROCESSING') {
            throw new BadRequestException('Payment already processed or is in progress');
        }

        if (order.paymentMethod === PaymentMethod.MTN_MOBILE_MONEY || order.paymentMethod === PaymentMethod.AIRTEL_MOBILE_MONEY) {
            const paymentResult = await paypackService.cashin({
                amount: Number(order.totalAmount),
                number: phoneNumber,
            });

            await this.prisma.order.update({
                where: { id },
                data: {
                    paymentStatus: 'PROCESSING',
                    transactionRef: paymentResult.ref,
                },
            });

            return {
                message: `Payment initiated via ${order.paymentMethod.replace('_', ' ')}. Please approve the transaction on your phone.`,
                transactionRef: paymentResult.ref,
                orderId: order.id,
            };
        } else if (order.paymentMethod === PaymentMethod.BANK_TRANSFER) {
            throw new BadRequestException('Bank transfer payments are processed manually. Please contact the cooperative for payment instructions.');
        } else if (order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY) {
            throw new BadRequestException('Cash on delivery payments are processed upon delivery.');
        } else {
            throw new BadRequestException('Payment method not supported for automatic processing');
        }
    }

    async retryPayment(id: string, dto: PaymentDto, user: ServiceUser) {
        const { phoneNumber } = dto;
        const order = await this.prisma.order.findUnique({ where: { id } });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.buyerId !== user.id) {
            throw new ForbiddenException('Not authorized');
        }

        if (order.paymentStatus !== 'FAILED') {
            throw new BadRequestException('Payment retry only available for failed payments');
        }

        if (order.paymentMethod === PaymentMethod.MTN_MOBILE_MONEY || order.paymentMethod === PaymentMethod.AIRTEL_MOBILE_MONEY) {
            const paymentResult = await paypackService.cashin({
                amount: Number(order.totalAmount),
                number: phoneNumber,
            });

            await this.prisma.order.update({
                where: { id },
                data: {
                    paymentStatus: 'PROCESSING',
                    transactionRef: paymentResult.ref,
                },
            });

            return {
                message: `Payment retry initiated via ${order.paymentMethod.replace('_', ' ')}. Please approve the transaction on your phone.`,
                transactionRef: paymentResult.ref,
                orderId: order.id,
            };
        } else {
            throw new BadRequestException('Payment retry not supported for this payment method');
        }
    }

    async cancelOrder(id: string, user: ServiceUser) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                items: true,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.buyerId !== user.id && user.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Not authorized');
        }

        if (order.status === OrderStatus.DELIVERED) {
            throw new BadRequestException('Cannot cancel delivered order');
        }

        await this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        availableStock: {
                            increment: item.quantity,
                        },
                    },
                });
            }

            await tx.order.update({
                where: { id },
                data: { status: OrderStatus.CANCELLED },
            });
        });

        return { message: 'Order cancelled successfully' };
    }

    async requestRefund(id: string, dto: RefundDto, user: ServiceUser) {
        const { reason } = dto;
        const order = await this.prisma.order.findUnique({ where: { id } });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.buyerId !== user.id) {
            throw new ForbiddenException('Not authorized');
        }

        if (order.paymentStatus !== 'FAILED') {
            throw new BadRequestException('Refund only available for failed payments');
        }

        if (!order.transactionRef) {
            throw new BadRequestException('Transaction reference not found, cannot process refund');
        }

        const refundResult = await paypackService.refund({
            transaction_ref: order.transactionRef,
        });

        await this.prisma.order.update({
            where: { id },
            data: {
                paymentStatus: 'REFUNDING',
            },
        });

        return {
            message: 'Refund request submitted. You will be notified once processed.',
            refundDetails: refundResult,
        };
    }
}
