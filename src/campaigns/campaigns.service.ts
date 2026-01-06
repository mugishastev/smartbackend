import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignType, CampaignStatus } from '@prisma/client';

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
            include: {
                products: {
                    include: {
                        product: true,
                    },
                },
            },
        });
    }

    async getLivePromotions(cooperativeId?: string) {
        const now = new Date();
        const where: any = {
            status: CampaignStatus.LIVE,
            type: CampaignType.PROMO,
            startDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } },
            ],
        };

        if (cooperativeId) {
            where.cooperativeId = cooperativeId;
        }

        return this.prisma.campaign.findMany({
            where,
            include: {
                products: {
                    orderBy: { priority: 'asc' },
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { featured: 'desc' }, // startDate is also good secondary sort if needed
        });
    }

    async getBundles(cooperativeId?: string) {
        const now = new Date();
        const where: any = {
            status: CampaignStatus.LIVE,
            type: { in: [CampaignType.BUNDLE, CampaignType.FLASH] },
            startDate: { lte: now },
            OR: [
                { endDate: null },
                { endDate: { gte: now } },
            ],
        };

        if (cooperativeId) {
            where.cooperativeId = cooperativeId;
        }

        return this.prisma.campaign.findMany({
            where,
            include: {
                products: {
                    orderBy: { priority: 'asc' },
                    include: {
                        product: true,
                    },
                },
            },
            orderBy: { endDate: 'asc' },
        });
    }
}
