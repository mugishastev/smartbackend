import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createCampaignDto: CreateCampaignDto) {
        return this.prisma.campaign.create({
            data: createCampaignDto,
        });
    }

    async findAll() {
        return this.prisma.campaign.findMany({
            orderBy: { createdAt: 'desc' },
            include: { cooperative: true },
        });
    }

    async findActive() {
        return this.prisma.campaign.findMany({
            where: { status: 'LIVE' },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.campaign.findUnique({
            where: { id },
            include: { products: true, cooperative: true },
        });
    }
}
