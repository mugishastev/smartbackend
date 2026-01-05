import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';

export class WishlistService {
  static async addToWishlist(userId: string, productId: string) {
    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { cooperative: true },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (!product.isActive) {
      throw new ApiError(400, 'Product is not available');
    }

    // Check if already in wishlist
    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      throw new ApiError(400, 'Product is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await prisma.wishlist.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
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
        },
      },
    });

    // Calculate average rating
    const ratingStats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...wishlistItem,
      product: {
        ...wishlistItem.product,
        averageRating: ratingStats._avg.rating || 0,
        reviewCount: ratingStats._count.rating || 0,
      },
    };
  }

  static async removeFromWishlist(userId: string, productId: string) {
    const wishlistItem = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new ApiError(404, 'Product not found in wishlist');
    }

    await prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { message: 'Product removed from wishlist' };
  }

  static async getUserWishlist(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
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
          },
        },
      }),
      prisma.wishlist.count({ where: { userId } }),
    ]);

    // Add average ratings to products
    const itemsWithRatings = await Promise.all(
      items.map(async (item) => {
        const ratingStats = await prisma.review.aggregate({
          where: { productId: item.productId },
          _avg: { rating: true },
          _count: { rating: true },
        });

        return {
          ...item,
          product: {
            ...item.product,
            averageRating: ratingStats._avg.rating || 0,
            reviewCount: ratingStats._count.rating || 0,
          },
        };
      })
    );

    return {
      items: itemsWithRatings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!item;
  }

  static async getWishlistCount(userId: string): Promise<number> {
    return prisma.wishlist.count({
      where: { userId },
    });
  }
}

