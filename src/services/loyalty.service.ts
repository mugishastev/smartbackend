import prisma from '../config/database';

export interface UserLoyaltyStatus {
  lifetimeSpend: number;
  points: number;
  tier: {
    id: string;
    name: string;
    badge?: string | null;
    minSpend: number;
    benefits?: string | null;
    priority: number;
  } | null;
  nextTier?: {
    id: string;
    name: string;
    minSpend: number;
  };
}

export class LoyaltyService {
  static async getTiers() {
    return prisma.loyaltyTier.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  static async getUserStatus(userId: string): Promise<UserLoyaltyStatus> {
    const aggregate = await prisma.order.aggregate({
      where: { buyerId: userId },
      _sum: { totalAmount: true },
    });

    const lifetimeSpend = Number(aggregate._sum.totalAmount ?? 0);
    const points = Math.floor(lifetimeSpend / 100);
    const tiers = await this.getTiers();

    if (!tiers.length) {
      return {
        lifetimeSpend,
        points,
        tier: null,
      };
    }

    const sorted = [...tiers].sort((a, b) => b.minSpend - a.minSpend);
    const tier = sorted.find(t => lifetimeSpend >= t.minSpend) ?? sorted[sorted.length - 1];
    const nextTier = tiers.find(t => t.minSpend > (tier?.minSpend ?? 0));

    return {
      lifetimeSpend,
      points,
      tier: tier
        ? {
            id: tier.id,
            name: tier.name,
            badge: tier.badge,
            minSpend: tier.minSpend,
            benefits: tier.benefits,
            priority: tier.priority,
          }
        : null,
      nextTier: nextTier
        ? {
            id: nextTier.id,
            name: nextTier.name,
            minSpend: nextTier.minSpend,
          }
        : undefined,
    };
  }
}

