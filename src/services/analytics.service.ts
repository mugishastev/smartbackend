import prisma from '../config/database';

export class AnalyticsService {
  static async getTopProducts(limit = 5) {
    const groups = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const details = await Promise.all(
      groups.map(async (row) => {
        const product = await prisma.product.findUnique({
          where: { id: row.productId },
          select: {
            id: true,
            name: true,
            price: true,
            images: true,
            averageRating: true,
          },
        });

        return {
          product,
          quantitySold: row._sum.quantity ?? 0,
          revenue: row._sum.subtotal ?? 0,
        };
      })
    );

    return details.filter(item => item.product);
  }

  static async getConversionRate(periodDays = 7) {
    const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const viewCount = await prisma.productView.count({
      where: {
        viewedAt: { gte: since },
      },
    });
    const orderCount = await prisma.order.count({
      where: {
        createdAt: { gte: since },
      },
    });

    const conversion = viewCount > 0 ? (orderCount / viewCount) * 100 : 0;
    return { conversionRate: Number(conversion.toFixed(2)), periodDays };
  }

  static async getEngagement() {
    const [messages, wishlistAdds, reviews, productViews] = await Promise.all([
      prisma.chatMessage.count(),
      prisma.wishlist.count(),
      prisma.review.count(),
      prisma.productView.count(),
    ]);

    return {
      messages,
      wishlistAdds,
      reviews,
      productViews,
    };
  }

  static async captureSnapshot(metric: string, value: number, metadata?: any) {
    return prisma.analyticsSnapshot.create({
      data: {
        metric,
        value,
        metadata,
      },
    });
  }

  static async getSnapshots(limit = 20) {
    return prisma.analyticsSnapshot.findMany({
      orderBy: { capturedAt: 'desc' },
      take: limit,
    });
  }
}

