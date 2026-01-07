import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Req, ForbiddenException, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nest-lab/fastify-multer';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../middleware/auth.middleware';
// import { UploadService } from '../services/upload.service'; // Assuming keeping existing upload service temporarily or usage in service?
// Controller logic in legacy handles upload.
// I will replicate logic: receive files, upload them, then pass image URLs to service.
// OR pass files to service? Legacy controller does `UploadService.uploadMultipleImages`.
// I should use that until I migrate UploadService fully (it is a utility service mostly).
import { UploadService } from '../common/services/upload.service';

@Controller('reviews')
export class ReviewsController {
    constructor(
        private readonly reviewsService: ReviewsService,
        private readonly uploadService: UploadService,
    ) { }

    @Get('product/:productId')
    async getProductReviews(
        @Param('productId') productId: string,
        @Query() query: ReviewQueryDto
    ) {
        return this.reviewsService.getProductReviews(productId, query);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard)
    async getUserReviews(@Req() req: AuthRequest, @Query() query: ReviewQueryDto) {
        return this.reviewsService.getUserReviews(req.user!.id, query);
    }

    @Post()
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(FilesInterceptor('images', 5))
    async create(
        @Body() dto: CreateReviewDto,
        @Req() req: AuthRequest,
        @UploadedFiles() files?: any[]
    ) {
        let images: string[] = [];
        if (files && files.length > 0) {
            // Legacy UploadService usage
            images = await this.uploadService.uploadMultipleImages(files as any[], 'reviews');
        }
        // Override images in DTO with uploaded ones if present
        if (images.length > 0) {
            dto.images = images;
        }

        // Since validation pipe ensures rating/types, we just call service
        // Note: DTO rating comes as string from FormData possibly?
        // Use validation pipe transformation! @Type(() => Number) in DTO?
        // CreateReviewDto rating is number. DTO transformation should handle it if 'transform: true' is generic config.
        // If not, explicit parsing might be needed. NestJS ValidationPipe with transform: true handles it.
        // However, if sent as multipart/form-data, numbers often arrive as strings.
        // I added @Type in DTOs previously for Query. For Body, safer to ensure.
        // Let's assume global pipe handles it or add @Type.

        // Actually, create-review.dto.ts: rating is @IsInt(). If string "5" comes, it might fail validation if transform not enable.
        // I should ensure DTO has @Type(() => Number) for rating just in case.

        return this.reviewsService.create(req.user!.id, { ...dto, rating: Number(dto.rating) });
    }

    @Post(':reviewId/helpful')
    @UseGuards(JwtAuthGuard)
    async markHelpful(@Param('reviewId') reviewId: string, @Req() req: AuthRequest) {
        return this.reviewsService.markHelpful(reviewId, req.user!.id);
    }

    @Delete(':reviewId')
    @UseGuards(JwtAuthGuard)
    async delete(@Param('reviewId') reviewId: string, @Req() req: AuthRequest) {
        return this.reviewsService.delete(reviewId, req.user!.id);
    }
}
