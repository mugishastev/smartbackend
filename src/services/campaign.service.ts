import { CampaignType, CampaignStatus } from '@prisma/client';
import prisma from '../config/database';

export class CampaignService {
  static async getLivePromotions(cooperativeId?: string) {
    const now = new Date();
    const where = {
      status: CampaignStatus.LIVE,
      type: CampaignType.PROMO,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
      cooperativeId: cooperativeId || undefined,
    };

    return prisma.campaign.findMany({
      where,
      include: {
        products: {
          orderBy: { priority: 'asc' },
          include: {
            product: true,
          },
        },
      },
      orderBy: { featured: 'desc', startDate: 'desc' },
    });
  }

  static async getBundles(cooperativeId?: string) {
    const now = new Date();
    const where = {
      status: CampaignStatus.LIVE,
      type: { in: [CampaignType.BUNDLE, CampaignType.FLASH] },
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
      cooperativeId: cooperativeId || undefined,
    };

    return prisma.campaign.findMany({
      where,
      include: {
        products: {
          orderBy: { priority: 'asc' },
          include: {
            product: true,
          },
        },
      },
      orderBy: { endDate: 'asc', startDate: 'desc' },
    });
  }

  static async getCampaignById(id: string) {
    return prisma.campaign.findUnique({
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
}

