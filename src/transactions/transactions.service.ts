import { Injectable, BadRequestException, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { ApprovalsService } from '../approvals/approvals.service';
import { BlockchainService } from '../common/services/blockchain.service';
import { UserRole, TransactionStatus, TransactionType } from '../lib/enums';

@Injectable()
export class TransactionsService {
    constructor(
        private prisma: PrismaService,
        private approvalsService: ApprovalsService,
        private blockchainService: BlockchainService,
    ) { }

    // Renamed to match legacy method name if preferred, or just 'create'
    async createTransaction(cooperativeId: string, dto: CreateTransactionDto, userId: string) {
        const { type, amount, description, category, reference } = dto;

        // Check if transaction requires approval (using logic similar to ApprovalsService)
        const requiresApproval = this.requiresApproval(type, amount);

        let status = TransactionStatus.PENDING;
        let blockchainHash: string | undefined;

        if (!requiresApproval) {
            status = TransactionStatus.APPROVED;
            const hashData = {
                cooperativeId,
                userId: userId || null, // Should unlikely be null if created by user
                type,
                amount,
                description,
                category,
                reference,
                status,
            };

            if (this.blockchainService) {
                blockchainHash = this.blockchainService.generateTransactionHash(hashData);
                // We do not await logging here strictly or we do? Legacy awaited.
                await this.blockchainService.logHash(blockchainHash);
            }
        }

        const transaction = await this.prisma.transaction.create({
            data: {
                cooperativeId,
                userId,
                type: type as any,
                amount,
                description,
                category,
                reference,
                status,
                blockchainHash,
            },
        });

        // If approval is required, create approval requests via ApprovalsService
        if (requiresApproval) {
            try {
                await this.approvalsService.createApprovalRequest(transaction.id, userId);
            } catch (error) {
                // If approval creation fails, rollback transaction
                await this.prisma.transaction.delete({ where: { id: transaction.id } });
                throw error;
            }
        }

        // Log activity
        await this.prisma.activityLog.create({
            data: {
                userId,
                cooperativeId,
                action: 'TRANSACTION_CREATED',
                entity: 'TRANSACTION',
                entityId: transaction.id,
                details: {
                    type,
                    amount,
                    requiresApproval,
                    status,
                },
            },
        });

        return transaction;
    }

    async getTransactionsByCooperative(cooperativeId: string, query: TransactionQueryDto) {
        const { status, type, userId, startDate, endDate, page = 1, limit = 20 } = query;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { cooperativeId };

        if (status) where.status = status;
        if (type) where.type = type;
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [transactions, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    approvals: {
                        include: {
                            approver: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async getTransactionById(id: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id },
            include: {
                cooperative: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                approvals: {
                    include: {
                        approver: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        return transaction;
    }

    private requiresApproval(type: string, amount: number): boolean {
        const sensitiveTypes = ['LOAN', 'WITHDRAWAL', 'EXPENSE'];
        const largeAmountThreshold = 100000;

        return (
            sensitiveTypes.includes(type) ||
            amount > largeAmountThreshold
        );
    }
}
