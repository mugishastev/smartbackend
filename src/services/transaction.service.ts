import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';
import { ApprovalService } from './approval.service';
import { blockchainService } from './blockchain.service';
import { TransactionStatus } from '../lib/enums';

export class TransactionService {
  static async createTransaction(cooperativeId: string, transactionData: any, userId?: string) {
    const { type, amount, description, category, reference } = transactionData;

    // Check if transaction requires approval
    const requiresApproval = this.requiresApproval(type, amount);

    let status = TransactionStatus.PENDING;
    let blockchainHash: string | undefined;

    if (!requiresApproval) {
      // For non-sensitive transactions, approve immediately and generate hash
      status = TransactionStatus.APPROVED;
      const hashData = {
        cooperativeId,
        userId: userId || null,
        type,
        amount,
        description,
        category,
        reference,
        status,
      };
      blockchainHash = blockchainService.generateTransactionHash(hashData);
      await blockchainService.logHash(blockchainHash);
    }

    const transaction = await prisma.transaction.create({
      data: {
        cooperativeId,
        userId,
        type,
        amount,
        description,
        category,
        reference,
        status,
        blockchainHash,
      },
    });

    // If approval is required, create approval requests
    if (requiresApproval && userId) {
      try {
        await ApprovalService.createApprovalRequest(transaction.id, userId);
      } catch (error) {
        // If approval creation fails, delete the transaction
        await prisma.transaction.delete({ where: { id: transaction.id } });
        throw error;
      }
    }

    // Log activity
    if (userId) {
      await prisma.activityLog.create({
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
    }

    return transaction;
  }

  static async getTransactionsByCooperative(cooperativeId: string, filters?: {
    status?: TransactionStatus;
    type?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const where: any = { cooperativeId };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const transactions = await prisma.transaction.findMany({
      where,
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
    });

    return transactions;
  }

  static async getTransactionById(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
          },
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
      throw new ApiError(404, 'Transaction not found');
    }

    return transaction;
  }

  private static requiresApproval(type: string, amount: number): boolean {
    // Define rules for which transactions require approval
    const sensitiveTypes = ['LOAN', 'WITHDRAWAL', 'EXPENSE'];
    const largeAmountThreshold = 100000; // Adjust based on requirements

    return (
      sensitiveTypes.includes(type) ||
      amount > largeAmountThreshold
    );
  }
}
