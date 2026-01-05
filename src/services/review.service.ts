import prisma from '../config/database';
import { ApiError } from '../lib/ApiError';

export class ReviewService {
  static async createReview(
    buyerId: string,
    productId: string,
    orderId: string | null,
    rating: number,
    comment?: string,
    images?: string[]
  ) {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { cooperative: true },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    // Check if buyer has ordered this product
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          buyerId,
          items: {
            some: { productId },
          },
          status: 'DELIVERED',
        },
      });

      if (!order) {
        throw new ApiError(403, 'You can only review products you have purchased');
      }

      // Check if review already exists for this order
      const existingReview = await prisma.review.findUnique({
        where: { orderId },
      });

      if (existingReview) {
        throw new ApiError(400, 'You have already reviewed this order');
      }
    } else {
      // For product reviews without order, check if user has purchased
      const hasPurchased = await prisma.order.findFirst({
        where: {
          buyerId,
          items: {
            some: { productId },
          },
          status: 'DELIVERED',
        },
      });

      if (!hasPurchased) {
        throw new ApiError(403, 'You can only review products you have purchased');
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        buyerId,
        productId,
        cooperativeId: product.cooperativeId,
        orderId,
        rating,
        comment,
        images: images || [],
        verified: !!orderId,
      },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Update product average rating
    await this.updateProductRating(productId);

    return review;
  }

  static async getProductReviews(
    productId: string,
    page: number = 1,
    limit: number = 10,
    sortBy: 'recent' | 'rating' | 'helpful' = 'recent'
  ) {
    const skip = (page - 1) * limit;
    
    let orderBy: any = { createdAt: 'desc' };
    if (sortBy === 'rating') orderBy = { rating: 'desc' };
    if (sortBy === 'helpful') orderBy = { helpfulCount: 'desc' };

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy,
        include: {
          buyer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { productId } }),
    ]);

    // Calculate rating distribution
    const ratingDistribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId },
      _count: { rating: true },
    });

    const distribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };

    ratingDistribution.forEach((item) => {
      const countValue = item._count.rating;
      distribution[item.rating as keyof typeof distribution] =
        typeof countValue === 'bigint' ? Number(countValue) : countValue;
    });

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      ratingDistribution: distribution,
    };
  }

  static async updateProductRating(productId: string) {
    const stats = await prisma.review.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: stats._avg.rating || 0,
        reviewCount: stats._count.rating || 0,
      },
    });
  }

  static async markHelpful(reviewId: string, userId: string) {
    // In a full implementation, you'd track which users marked helpful to prevent duplicate votes
    // For now, just increment
    const review = await prisma.review.update({
      where: { id: reviewId },
      data: { helpfulCount: { increment: 1 } },
      include: {
        buyer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return review;
  }

  static async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new ApiError(404, 'Review not found');
    }

    if (review.buyerId !== userId) {
      throw new ApiError(403, 'You can only delete your own reviews');
    }

    const productId = review.productId;

    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Update product rating
    await this.updateProductRating(productId);

    return { message: 'Review deleted successfully' };
  }

  static async getUserReviews(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { buyerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
            },
          },
        },
      }),
      prisma.review.count({ where: { buyerId: userId } }),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

