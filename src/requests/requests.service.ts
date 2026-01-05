import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, createRequestDto: CreateRequestDto) {
        return this.prisma.request.create({
            data: {
                ...createRequestDto,
                requesterId: userId,
                status: 'PENDING',
            },
        });
    }

    async findAll(cooperativeId: string) {
        return this.prisma.request.findMany({
            where: { cooperativeId },
            include: { requester: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findMyRequests(userId: string) {
        return this.prisma.request.findMany({
            where: { requesterId: userId },
            orderBy: { createdAt: 'desc' },
        });
    }
}
