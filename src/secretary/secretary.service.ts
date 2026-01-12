import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class SecretaryService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboard(cooperativeId: string) {
        // Verify cooperative exists
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Get current month start and end
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        // Get statistics
        const [
            totalMembers,
            pendingApprovals,
            monthlyTransactions,
            allTransactions,
        ] = await Promise.all([
            this.prisma.user.count({
                where: {
                    cooperativeId,
                    isActive: true,
                    role: { in: ['MEMBER', 'SECRETARY', 'ACCOUNTANT', 'COOP_ADMIN'] },
                },
            }),
            this.prisma.approval.count({
                where: {
                    status: RequestStatus.PENDING,
                    transaction: {
                        cooperativeId,
                    },
                },
            }),
            this.prisma.transaction.count({
                where: {
                    cooperativeId,
                    createdAt: {
                        gte: monthStart,
                        lte: monthEnd,
                    },
                },
            }),
            this.prisma.transaction.findMany({
                where: { cooperativeId },
            }),
        ]);

        // Calculate compliance rate (approved transactions / total transactions)
        const approvedTransactions = allTransactions.filter(
            t => t.status === 'APPROVED'
        ).length;
        const complianceRate =
            allTransactions.length > 0
                ? (approvedTransactions / allTransactions.length) * 100
                : 100;

        return {
            stats: {
                totalMembers,
                pendingApprovals,
                monthlyTransactions,
                complianceRate: Math.round(complianceRate * 10) / 10, // Round to 1 decimal
            },
        };
    }

    async getPendingApprovals(cooperativeId: string) {
        // Verify cooperative exists
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Get pending transactions that need approval
        const pendingTransactions = await this.prisma.transaction.findMany({
            where: {
                cooperativeId,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                approvals: {
                    include: {
                        approver: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Transform to match frontend expectations
        const approvals = pendingTransactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: Number(t.amount),
            requestedBy: t.user
                ? `${t.user.firstName} ${t.user.lastName}`
                : 'Unknown',
            createdAt: t.createdAt.toISOString(),
            category: t.category || 'General',
            description: t.description,
            priority: Number(t.amount) > 1000000 ? 'HIGH' : Number(t.amount) > 500000 ? 'MEDIUM' : 'LOW',
            status: t.status,
        }));

        return { approvals };
    }

    async approveTransaction(transactionId: string) {
        // Get transaction
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new ApiError(404, 'Transaction not found');
        }

        // Update transaction status to approved
        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'APPROVED',
            },
        });

        // Log activity
        await this.prisma.activityLog.create({
            data: {
                userId: 'system', // In real implementation, get from request context
                cooperativeId: transaction.cooperativeId,
                action: 'TRANSACTION_APPROVED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: {
                    amount: Number(transaction.amount),
                    type: transaction.type,
                },
            },
        });

        return {
            message: 'Transaction approved successfully',
        };
    }

    async rejectTransaction(transactionId: string) {
        // Get transaction
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) {
            throw new ApiError(404, 'Transaction not found');
        }

        // Update transaction status to rejected
        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: 'REJECTED',
            },
        });

        // Log activity
        await this.prisma.activityLog.create({
            data: {
                userId: 'system', // In real implementation, get from request context
                cooperativeId: transaction.cooperativeId,
                action: 'TRANSACTION_REJECTED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: {
                    amount: Number(transaction.amount),
                    type: transaction.type,
                },
            },
        });

        return {
            message: 'Transaction rejected successfully',
        };
    }
}
