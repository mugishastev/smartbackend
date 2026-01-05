import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';
import { UserRole, TransactionStatus } from '../lib/enums';
import { blockchainService } from './blockchain.service';

export class ApprovalService {
  static async createApprovalRequest(
    transactionId: string,
    requesterId: string
  ) {
    const transaction = await prisma.transaction.findUnique({
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
      throw new ApiError(404, 'Transaction not found');
    }

    // Check if transaction requires approval
    if (!this.requiresApproval(transaction)) {
      throw new ApiError(400, 'This transaction does not require approval');
    }

    // Create approval requests for all eligible approvers
    const approvers = transaction.cooperative.users;
    const approvalPromises = approvers.map((approver: any) =>
      prisma.approval.create({
        data: {
          transactionId,
          approverId: approver.id,
          status: 'PENDING',
        },
      })
    );

    await Promise.all(approvalPromises);

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.PENDING },
    });

    // Log activity
    await prisma.activityLog.create({
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

  static async approveTransaction(
    transactionId: string,
    approverId: string,
    comment?: string
  ) {
    const approval = await prisma.approval.findFirst({
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
      throw new ApiError(404, 'Approval request not found or already processed');
    }

    // Check authorization
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
      throw new ApiError(403, 'Not authorized to approve transactions');
    }

    if (approver.cooperativeId !== approval.transaction.cooperativeId) {
      throw new ApiError(403, 'Not authorized for this cooperative');
    }

    // Update approval
    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: 'APPROVED',
        comment,
      },
    });

    // Check if all approvals are received
    const allApprovals = await prisma.approval.findMany({
      where: { transactionId },
    });

    const approvedCount = allApprovals.filter((a: any) => a.status === 'APPROVED').length;
    const totalApprovers = allApprovals.length;

    // If majority approved, finalize transaction
    if (approvedCount > totalApprovers / 2) {
      await this.finalizeTransaction(transactionId);
    }

    // Log activity
    await prisma.activityLog.create({
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

  static async rejectTransaction(
    transactionId: string,
    approverId: string,
    comment?: string
  ) {
    const approval = await prisma.approval.findFirst({
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
      throw new ApiError(404, 'Approval request not found or already processed');
    }

    // Check authorization
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
      throw new ApiError(403, 'Not authorized to reject transactions');
    }

    if (approver.cooperativeId !== approval.transaction.cooperativeId) {
      throw new ApiError(403, 'Not authorized for this cooperative');
    }

    // Update approval
    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: 'REJECTED',
        comment,
      },
    });

    // Update transaction status to rejected
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.REJECTED },
    });

    // Log activity
    await prisma.activityLog.create({
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

  static async getPendingApprovals(userId: string) {
    const approvals = await prisma.approval.findMany({
      where: {
        approverId: userId,
        status: 'PENDING',
      },
      include: {
        transaction: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return approvals;
  }

  static async getTransactionApprovals(transactionId: string) {
    const approvals = await prisma.approval.findMany({
      where: { transactionId },
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
    });

    return approvals;
  }

  private static requiresApproval(transaction: any): boolean {
    // Define rules for which transactions require approval
    const sensitiveTypes = ['LOAN', 'WITHDRAWAL', 'EXPENSE'];
    const largeAmountThreshold = 100000; // Adjust based on requirements

    return (
      sensitiveTypes.includes(transaction.type) ||
      transaction.amount > largeAmountThreshold
    );
  }

  private static async finalizeTransaction(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) return;

    // Generate blockchain hash
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

    // Log to blockchain (simulated)
    const blockchainLog = await blockchainService.logHash(hash);

    // Update transaction with hash and status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: TransactionStatus.APPROVED,
        blockchainHash: hash,
      },
    });

    // Log finalization
    await prisma.activityLog.create({
      data: {
        userId: 'system', // System-generated finalization
        cooperativeId: transaction.cooperativeId,
        action: 'TRANSACTION_FINALIZED',
        entity: 'TRANSACTION',
        entityId: transactionId,
        details: { blockchainHash: hash, blockNumber: blockchainLog.blockNumber },
      },
    });
  }
}
