import prisma from '../config/database';

export class RecommendationService {
  /**
   * Get product recommendations based on various factors
   */
  static async getRecommendations(
    userId: string | null,
    productId?: string,
    limit: number = 10
  ) {
    const recommendations: any[] = [];

    // 1. Similar products (same category)
    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { category: true, cooperativeId: true },
      });

      if (product) {
        const similarProducts = await prisma.product.findMany({
          where: {
            id: { not: productId },
            category: product.category,
            isActive: true,
          },
          take: Math.floor(limit * 0.4), // 40% of recommendations
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                district: true,
                logo: true,
              },
            },
            _count: {
              select: { reviews: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        recommendations.push(...similarProducts);
      }
    }

    // 2. Popular products (most reviewed/rated)
    const popularProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(productId ? { id: { not: productId } } : {}),
        ...(recommendations.length > 0
          ? { id: { notIn: recommendations.map((p) => p.id) } }
          : {}),
      },
      take: Math.floor(limit * 0.3), // 30% of recommendations
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            district: true,
            logo: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    recommendations.push(...popularProducts);

    // 3. Recently added products
    const recentProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(recommendations.length > 0
          ? { id: { notIn: recommendations.map((p) => p.id) } }
          : {}),
      },
      take: Math.floor(limit * 0.3), // 30% of recommendations
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            district: true,
            logo: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    recommendations.push(...recentProducts);

    // 4. User-specific recommendations (based on wishlist and order history)
    if (userId) {
      // Get user's wishlist categories
      const userWishlist = await prisma.wishlist.findMany({
        where: { userId },
        include: {
          product: {
            select: { category: true },
          },
        },
        take: 10,
      });

      const preferredCategories = [
        ...new Set(userWishlist.map((item) => item.product.category)),
      ];

      if (preferredCategories.length > 0) {
        const personalizedProducts = await prisma.product.findMany({
          where: {
            isActive: true,
            category: { in: preferredCategories },
            ...(recommendations.length > 0
              ? { id: { notIn: recommendations.map((p) => p.id) } }
              : {}),
          },
          take: Math.min(5, limit - recommendations.length),
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                district: true,
                logo: true,
              },
            },
            _count: {
              select: { reviews: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        recommendations.push(...personalizedProducts);
      }

      // Get products from cooperatives user has ordered from
      const userOrders = await prisma.order.findMany({
        where: { buyerId: userId, status: 'DELIVERED' },
        include: {
          items: {
            include: {
              product: {
                select: { cooperativeId: true },
              },
            },
          },
        },
        take: 10,
      });

      const preferredCooperatives = [
        ...new Set(
          userOrders
            .flatMap((order) => order.items)
            .map((item) => item.product.cooperativeId)
        ),
      ];

      if (preferredCooperatives.length > 0) {
        const cooperativeProducts = await prisma.product.findMany({
          where: {
            isActive: true,
            cooperativeId: { in: preferredCooperatives },
            ...(recommendations.length > 0
              ? { id: { notIn: recommendations.map((p) => p.id) } }
              : {}),
          },
          take: Math.min(5, limit - recommendations.length),
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                district: true,
                logo: true,
              },
            },
            _count: {
              select: { reviews: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        recommendations.push(...cooperativeProducts);
      }
    }

    // Remove duplicates and limit results
    const uniqueProducts = Array.from(
      new Map(recommendations.map((p) => [p.id, p])).values()
    ).slice(0, limit);

    // Add average ratings
    const productsWithRatings = await Promise.all(
      uniqueProducts.map(async (product) => {
        const ratingStats = await prisma.review.aggregate({
          where: { productId: product.id },
          _avg: { rating: true },
          _count: { rating: true },
        });

        return {
          ...product,
          averageRating: ratingStats._avg.rating || 0,
          reviewCount: ratingStats._count.rating || 0,
        };
      })
    );

    return productsWithRatings;
  }

  /**
   * Get trending products
   */
  static async getTrendingProducts(limit: number = 10) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Step 1: Get all relevant order items
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: thirtyDaysAgo },
        },
        product: {
          isActive: true,
        },
      },
      select: {
        productId: true,
      },
    });

    // Step 2: Count occurrences in memory
    const productCounts = orderItems.reduce((acc, item) => {
      acc[item.productId] = (acc[item.productId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Step 3: Sort by count
    const sortedProductIds = Object.keys(productCounts).sort(
      (a, b) => productCounts[b] - productCounts[a]
    );

    // Step 4: Get top N
    const topProductIds = sortedProductIds.slice(0, limit);

    if (topProductIds.length === 0) {
      return [];
    }

    // Step 5: Fetch the product details
    const trendingProducts = await prisma.product.findMany({
      where: {
        id: { in: topProductIds },
      },
      include: {
        cooperative: {
          select: { id: true, name: true, district: true, logo: true },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    // Re-order them according to sortedProductIds
    const orderedProducts = topProductIds
      .map((id) => trendingProducts.find((p) => p.id === id))
      .filter((p): p is typeof trendingProducts[0] => !!p);


    // Add average ratings
    const productsWithRatings = await Promise.all(
      orderedProducts.map(async (product) => {
        const ratingStats = await prisma.review.aggregate({
          where: { productId: product.id },
          _avg: { rating: true },
          _count: { rating: true },
        });

        return {
          ...product,
          averageRating: ratingStats._avg.rating || 0,
          reviewCount: ratingStats._count.rating || 0,
        };
      })
    );

    return productsWithRatings;
  }

  /**
   * Get products you might like based on viewing history
   */
  static async getYouMightLike(userId: string, limit: number = 10) {
    // Get user's order history categories
    const userOrders = await prisma.order.findMany({
      where: { buyerId: userId },
      include: {
        items: {
          include: {
            product: {
              select: { category: true, cooperativeId: true },
            },
          },
        },
      },
    });

    const categories = new Set<string>();
    const cooperativeIds = new Set<string>();

    userOrders.forEach((order) => {
      order.items.forEach((item) => {
        categories.add(item.product.category);
        cooperativeIds.add(item.product.cooperativeId);
      });
    });

    const recommendations = await prisma.product.findMany({
      where: {
        isActive: true,
        OR: [
          { category: { in: Array.from(categories) } },
          { cooperativeId: { in: Array.from(cooperativeIds) } },
        ],
      },
      take: limit,
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            district: true,
            logo: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add average ratings
    const productsWithRatings = await Promise.all(
      recommendations.map(async (product) => {
        const ratingStats = await prisma.review.aggregate({
          where: { productId: product.id },
          _avg: { rating: true },
          _count: { rating: true },
        });
        
        return {
          ...product,
          averageRating: ratingStats._avg.rating || 0,
          reviewCount: ratingStats._count.rating || 0,
        };
      })
    );

    return productsWithRatings;
  }
}

