import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class BuyerService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        const [totalOrders, pendingOrders, completedOrders, favorites, totalSpent] = await Promise.all([
            this.prisma.order.count({ where: { buyerId: userId } }),
            this.prisma.order.count({ where: { buyerId: userId, status: 'PENDING' } }),
            this.prisma.order.count({ where: { buyerId: userId, status: 'DELIVERED' } }),
            this.prisma.wishlist.count({ where: { userId } }),
            this.prisma.order.aggregate({
                where: { buyerId: userId, paymentStatus: 'COMPLETED' },
                _sum: { totalAmount: true },
            }),
        ]);

        const recentOrders = await this.prisma.order.findMany({
            where: { buyerId: userId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        return {
            totalOrders,
            pendingOrders,
            completedOrders,
            favorites,
            totalSpent: totalSpent._sum.totalAmount || 0,
            recentOrders,
        };
    }

    async getOrders(userId: string, limit: number = 20) {
        return this.prisma.order.findMany({
            where: { buyerId: userId },
            take: Number(limit),
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        product: {
                            include: {
                                cooperative: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    async getPayments(userId: string) {
        // Get orders with payment information for the buyer
        const orders = await this.prisma.order.findMany({
            where: {
                buyerId: userId,
                paymentStatus: { in: ['COMPLETED', 'PROCESSING', 'PENDING'] }
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
            select: {
                id: true,
                orderNumber: true,
                totalAmount: true,
                paymentMethod: true,
                paymentStatus: true,
                transactionRef: true,
                createdAt: true,
            }
        });

        // Transform to payment format
        return orders.map(order => ({
            id: order.id,
            amount: order.totalAmount,
            status: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            reference: order.transactionRef,
            description: `Payment for Order ${order.orderNumber}`,
            createdAt: order.createdAt,
        }));
    }
}
