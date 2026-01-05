import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { UserRole, TransactionStatus } from '../lib/enums';
// import { blockchainService } from '../services/blockchain.service'; // Use direct import or provider?
// Using direct import for now as it's a utility class instance
import { blockchainService } from '../services/blockchain.service';

@Injectable()
export class ApprovalsService {
    constructor(private prisma: PrismaService) { }

    async createApprovalRequest(transactionId: string, requesterId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
            include: {
                cooperative: {
                    include: {
                        users: {
                            where: {
                                role: { in: [UserRole.COOP_ADMIN, UserRole.SECRETARY] },
                            },
                        },
                    },
                },
            },
        });

        if (!transaction) {
            throw new NotFoundException('Transaction not found');
        }

        if (!this.requiresApproval(transaction)) {
            throw new BadRequestException('This transaction does not require approval');
        }

        const approvers = transaction.cooperative.users;
        const approvalPromises = approvers.map((approver) =>
            this.prisma.approval.create({
                data: {
                    transactionId,
                    approverId: approver.id,
                    status: 'PENDING',
                },
            })
        );

        await Promise.all(approvalPromises);

        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: { status: TransactionStatus.PENDING },
        });

        await this.prisma.activityLog.create({
            data: {
                userId: requesterId,
                cooperativeId: transaction.cooperativeId,
                action: 'APPROVAL_REQUEST_CREATED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: { approversCount: approvers.length },
            },
        });

        return {
            message: 'Approval request created successfully',
            transactionId,
            approvers: approvers.map((a: any) => ({ id: a.id, name: `${a.firstName} ${a.lastName}` })),
        };
    }

    async approveTransaction(transactionId: string, approverId: string, comment?: string) {
        const approval = await this.prisma.approval.findFirst({
            where: {
                transactionId,
                approverId,
                status: 'PENDING',
            },
            include: {
                transaction: {
                    include: {
                        cooperative: true,
                    },
                },
            },
        });

        if (!approval) {
            throw new NotFoundException('Approval request not found or already processed');
        }

        const approver = await this.prisma.user.findUnique({
            where: { id: approverId },
        });

        if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
            throw new ForbiddenException('Not authorized to approve transactions');
        }

        if (approver.cooperativeId !== approval.transaction.cooperativeId) {
            throw new ForbiddenException('Not authorized for this cooperative');
        }

        await this.prisma.approval.update({
            where: { id: approval.id },
            data: {
                status: 'APPROVED',
                comment,
            },
        });

        const allApprovals = await this.prisma.approval.findMany({
            where: { transactionId },
        });

        const approvedCount = allApprovals.filter((a) => a.status === 'APPROVED').length;
        const totalApprovers = allApprovals.length;

        if (approvedCount > totalApprovers / 2) {
            await this.finalizeTransaction(transactionId);
        }

        await this.prisma.activityLog.create({
            data: {
                userId: approverId,
                cooperativeId: approval.transaction.cooperativeId,
                action: 'TRANSACTION_APPROVED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: { comment, approvedCount, totalApprovers },
            },
        });

        return {
            message: 'Transaction approved successfully',
            approvedCount,
            totalApprovers,
            finalized: approvedCount > totalApprovers / 2,
        };
    }

    async rejectTransaction(transactionId: string, approverId: string, comment?: string) {
        const approval = await this.prisma.approval.findFirst({
            where: {
                transactionId,
                approverId,
                status: 'PENDING',
            },
            include: {
                transaction: {
                    include: {
                        cooperative: true,
                    },
                },
            },
        });

        if (!approval) {
            throw new NotFoundException('Approval request not found or already processed');
        }

        const approver = await this.prisma.user.findUnique({
            where: { id: approverId },
        });

        if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
            throw new ForbiddenException('Not authorized to reject transactions');
        }

        if (approver.cooperativeId !== approval.transaction.cooperativeId) {
            throw new ForbiddenException('Not authorized for this cooperative');
        }

        await this.prisma.approval.update({
            where: { id: approval.id },
            data: {
                status: 'REJECTED',
                comment,
            },
        });

        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: { status: TransactionStatus.REJECTED },
        });

        await this.prisma.activityLog.create({
            data: {
                userId: approverId,
                cooperativeId: approval.transaction.cooperativeId,
                action: 'TRANSACTION_REJECTED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: { comment },
            },
        });

        return { message: 'Transaction rejected successfully' };
    }

    // Helper method made public if needed, or private
    private requiresApproval(transaction: any): boolean {
        const sensitiveTypes = ['LOAN', 'WITHDRAWAL', 'EXPENSE'];
        const largeAmountThreshold = 100000;

        return (
            sensitiveTypes.includes(transaction.type) ||
            transaction.amount > largeAmountThreshold
        );
    }

    private async finalizeTransaction(transactionId: string) {
        const transaction = await this.prisma.transaction.findUnique({
            where: { id: transactionId },
        });

        if (!transaction) return;

        if (!blockchainService) {
            // Fallback or log error
            console.warn('Blockchain service not available for finalization');
            return;
        }

        const hash = blockchainService.generateTransactionHash({
            cooperativeId: transaction.cooperativeId,
            userId: transaction.userId,
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category: transaction.category,
            reference: transaction.reference,
            status: TransactionStatus.APPROVED,
        });

        const blockchainLog = await blockchainService.logHash(hash);

        await this.prisma.transaction.update({
            where: { id: transactionId },
            data: {
                status: TransactionStatus.APPROVED,
                blockchainHash: hash,
            },
        });

        await this.prisma.activityLog.create({
            data: {
                userId: 'system',
                cooperativeId: transaction.cooperativeId,
                action: 'TRANSACTION_FINALIZED',
                entity: 'TRANSACTION',
                entityId: transactionId,
                details: { blockchainHash: hash, blockNumber: blockchainLog.blockNumber },
            },
        });
    }
}
