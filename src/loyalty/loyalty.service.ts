import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';

@Injectable()
export class LoyaltyService {
    constructor(private readonly prisma: PrismaService) { }

    async createTier(createLoyaltyTierDto: CreateLoyaltyTierDto) {
        return this.prisma.loyaltyTier.create({
            data: createLoyaltyTierDto,
        });
    }

    async findAllTiers() {
        return this.prisma.loyaltyTier.findMany({
            orderBy: { minSpend: 'asc' },
        });
    }

    async getUserLoyalty(userId: string) {
        return this.prisma.userLoyalty.findFirst({
            where: { userId },
            include: { tier: true },
        });
    }
}
