import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto, ReviewSortBy } from './dto/review-query.dto';

@Injectable()
export class ReviewsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, dto: CreateReviewDto) {
        const { productId, orderId, rating, comment, images } = dto;

        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        const product = await this.prisma.product.findUnique({
            where: { id: productId },
            include: { cooperative: true },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        if (orderId) {
            const order = await this.prisma.order.findFirst({
                where: {
                    id: orderId,
                    buyerId: userId,
                    items: {
                        some: { productId },
                    },
                    status: 'DELIVERED',
                },
            });

            if (!order) {
                throw new ForbiddenException('You can only review products you have purchased and received');
            }

            const existingReview = await this.prisma.review.findUnique({
                where: { orderId },
            });

            if (existingReview) {
                throw new BadRequestException('You have already reviewed this order');
            }
        } else {
            const hasPurchased = await this.prisma.order.findFirst({
                where: {
                    buyerId: userId,
                    items: {
                        some: { productId },
                    },
                    status: 'DELIVERED',
                },
            });

            if (!hasPurchased) {
                throw new ForbiddenException('You can only review products you have purchased and received');
            }
        }

        const review = await this.prisma.review.create({
            data: {
                buyerId: userId,
                productId,
                cooperativeId: product.cooperativeId,
                orderId: orderId || undefined,
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
                        // avatar: true, // Avatar might not exist on User model, check schema if error
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

        await this.updateProductRating(productId);

        return review;
    }

    async getProductReviews(productId: string, query: ReviewQueryDto) {
        const { page = 1, limit = 10, sortBy = ReviewSortBy.RECENT } = query;
        const skip = (Number(page) - 1) * Number(limit);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy === ReviewSortBy.RATING) orderBy = { rating: 'desc' };
        if (sortBy === ReviewSortBy.HELPFUL) orderBy = { helpfulCount: 'desc' };

        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { productId },
                skip,
                take: Number(limit),
                orderBy,
                include: {
                    buyer: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            this.prisma.review.count({ where: { productId } }),
        ]);

        const ratingDistribution = await this.prisma.review.groupBy({
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
            distribution[item.rating as keyof typeof distribution] = Number(countValue);
        });

        return {
            reviews,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
            ratingDistribution: distribution,
        };
    }

    async getUserReviews(userId: string, query: ReviewQueryDto) {
        const { page = 1, limit = 10 } = query;
        const skip = (Number(page) - 1) * Number(limit);

        const [reviews, total] = await Promise.all([
            this.prisma.review.findMany({
                where: { buyerId: userId },
                skip,
                take: Number(limit),
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
            this.prisma.review.count({ where: { buyerId: userId } }),
        ]);

        return {
            reviews,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async markHelpful(reviewId: string, userId: string) {
        // Check if review exists
        const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
        if (!review) throw new NotFoundException('Review not found');

        return this.prisma.review.update({
            where: { id: reviewId },
            data: { helpfulCount: { increment: 1 } },
        });
    }

    async delete(reviewId: string, userId: string) {
        const review = await this.prisma.review.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.buyerId !== userId) {
            throw new ForbiddenException('You can only delete your own reviews');
        }

        const productId = review.productId;

        await this.prisma.review.delete({
            where: { id: reviewId },
        });

        await this.updateProductRating(productId);

        return { message: 'Review deleted successfully' };
    }

    private async updateProductRating(productId: string) {
        const stats = await this.prisma.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        await this.prisma.product.update({
            where: { id: productId },
            data: {
                averageRating: stats._avg.rating || 0,
                reviewCount: stats._count.rating || 0,
            },
        });
    }
}
