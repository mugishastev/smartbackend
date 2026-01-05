import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';
import { UserRole, RequestStatus } from '../lib/enums';

export class RequestService {
  static async createRequest(
    cooperativeId: string,
    requesterId: string,
    requestData: {
      type: string;
      amount?: number;
      description: string;
    }
  ) {
    const { type, amount, description } = requestData;

    // Validate request type
    const validTypes = ['LOAN', 'WITHDRAWAL', 'MEMBERSHIP', 'COMPLAINT', 'RESIGNATION'];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid request type');
    }

    // Validate amount for financial requests
    if ((type === 'LOAN' || type === 'WITHDRAWAL') && (!amount || amount <= 0)) {
      throw new ApiError(400, 'Amount is required for financial requests');
    }

    const request = await prisma.request.create({
      data: {
        cooperativeId,
        requesterId,
        type,
        amount,
        description,
        status: RequestStatus.PENDING,
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: requesterId,
        cooperativeId,
        action: 'REQUEST_CREATED',
        entity: 'REQUEST',
        entityId: request.id,
        details: { type, amount, description },
      },
    });

    return request;
  }

  static async getRequestsByCooperative(cooperativeId: string, filters?: {
    status?: RequestStatus;
    type?: string;
    requesterId?: string;
  }) {
    const where: any = { cooperativeId };

    if (filters?.status) where.status = filters.status;
    if (filters?.type) where.type = filters.type;
    if (filters?.requesterId) where.requesterId = filters.requesterId;

    const requests = await prisma.request.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  static async getRequestsByUser(userId: string, cooperativeId?: string) {
    const where: any = { requesterId: userId };
    if (cooperativeId) where.cooperativeId = cooperativeId;

    const requests = await prisma.request.findMany({
      where,
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests;
  }

  static async getRequestById(requestId: string) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        cooperative: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    return request;
  }

  static async approveRequest(
    requestId: string,
    approverId: string,
    comment?: string
  ) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        cooperative: true,
        requester: true,
      },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ApiError(400, 'Request is not in pending status');
    }

    // Check if approver has permission
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
      throw new ApiError(403, 'Not authorized to approve requests');
    }

    if (approver.cooperativeId !== request.cooperativeId) {
      throw new ApiError(403, 'Not authorized for this cooperative');
    }

    // Update request
    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.APPROVED,
        approvedBy: [...(request.approvedBy || []), approverId],
        processedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Create transaction for financial requests
    if ((request.type === 'LOAN' || request.type === 'WITHDRAWAL') && request.amount) {
      await prisma.transaction.create({
        data: {
          cooperativeId: request.cooperativeId,
          userId: request.requesterId,
          type: request.type === 'LOAN' ? 'LOAN' : 'WITHDRAWAL',
          amount: request.amount,
          description: `Approved ${request.type.toLowerCase()}: ${request.description}`,
          status: 'PENDING', // Will need approval workflow
        },
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: approverId,
        cooperativeId: request.cooperativeId,
        action: 'REQUEST_APPROVED',
        entity: 'REQUEST',
        entityId: requestId,
        details: { comment },
      },
    });

    return updatedRequest;
  }

  static async rejectRequest(
    requestId: string,
    approverId: string,
    rejectionReason: string
  ) {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        cooperative: true,
      },
    });

    if (!request) {
      throw new ApiError(404, 'Request not found');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new ApiError(400, 'Request is not in pending status');
    }

    // Check if approver has permission
    const approver = await prisma.user.findUnique({
      where: { id: approverId },
    });

    if (!approver || (approver.role !== UserRole.COOP_ADMIN && approver.role !== UserRole.SECRETARY)) {
      throw new ApiError(403, 'Not authorized to reject requests');
    }

    if (approver.cooperativeId !== request.cooperativeId) {
      throw new ApiError(403, 'Not authorized for this cooperative');
    }

    const updatedRequest = await prisma.request.update({
      where: { id: requestId },
      data: {
        status: RequestStatus.REJECTED,
        rejectedBy: approverId,
        rejectionReason,
        processedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: approverId,
        cooperativeId: request.cooperativeId,
        action: 'REQUEST_REJECTED',
        entity: 'REQUEST',
        entityId: requestId,
        details: { rejectionReason },
      },
    });

    return updatedRequest;
  }

  static async getPendingRequestsCount(cooperativeId: string) {
    return await prisma.request.count({
      where: {
        cooperativeId,
        status: RequestStatus.PENDING,
      },
    });
  }
}
