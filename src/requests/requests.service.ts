import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { UserRole, RequestStatus } from '../lib/enums';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createRequestDto: CreateRequestDto, requesterId: string) {
        const { type, amount, description, cooperativeId } = createRequestDto;

        // Validate request type
        const validTypes = ['LOAN', 'WITHDRAWAL', 'MEMBERSHIP', 'COMPLAINT', 'RESIGNATION'];
        if (!validTypes.includes(type)) {
            throw new ApiError(400, 'Invalid request type');
        }

        // Validate amount for financial requests
        if ((type === 'LOAN' || type === 'WITHDRAWAL') && (!amount || amount <= 0)) {
            throw new ApiError(400, 'Amount is required for financial requests');
        }

        const request = await this.prisma.request.create({
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
        await this.prisma.activityLog.create({
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

    async findAllByCooperative(cooperativeId: string) {
        return this.prisma.request.findMany({
            where: { cooperativeId },
            include: {
                requester: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllMyRequests(userId: string) {
        return this.prisma.request.findMany({
            where: { requesterId: userId },
            include: {
                cooperative: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const request = await this.prisma.request.findUnique({
            where: { id },
            include: {
                requester: true,
                cooperative: true
            }
        });
        if (!request) throw new ApiError(404, 'Request not found');
        return request;
    }
}
