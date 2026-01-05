import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, createReportDto: CreateReportDto) {
        return this.prisma.report.create({
            data: {
                ...createReportDto,
                generatedBy: userId,
            },
        });
    }

    async findAll(cooperativeId: string) {
        return this.prisma.report.findMany({
            where: { cooperativeId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.report.findUnique({
            where: { id },
        });
    }
}
