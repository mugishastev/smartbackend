import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) { }

  async addToWishlist(userId: string, productId: string) {
    // Check if product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { cooperative: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestException('Product is not available');
    }

    // Check if already in wishlist
    const existing = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Product is already in your wishlist');
    }

    // Add to wishlist
    const wishlistItem = await this.prisma.wishlist.create({
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
    const ratingStats = await this.prisma.review.aggregate({
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

  async removeFromWishlist(userId: string, productId: string) {
    const wishlistItem = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Product not found in wishlist');
    }

    await this.prisma.wishlist.delete({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return { message: 'Product removed from wishlist' };
  }

  async getUserWishlist(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.wishlist.findMany({
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
      this.prisma.wishlist.count({ where: { userId } }),
    ]);

    // Add average ratings to products
    const itemsWithRatings = await Promise.all(
      items.map(async (item) => {
        const ratingStats = await this.prisma.review.aggregate({
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

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.prisma.wishlist.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    return !!item;
  }

  async getWishlistCount(userId: string): Promise<number> {
    return this.prisma.wishlist.count({
      where: { userId },
    });
  }
}

