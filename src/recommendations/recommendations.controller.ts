import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { RecommendationService } from '../services/recommendation.service';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('recommendations')
export class RecommendationsController {
    @Get('trending')
    async getTrending(@Query('limit') limit?: string) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return RecommendationService.getTrendingProducts(limitNum);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    async getRecommendations(
        @Req() req: any,
        @Query('productId') productId?: string,
        @Query('limit') limit?: string
    ) {
        const userId = req.user?.id || null;
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return RecommendationService.getRecommendations(userId, productId, limitNum);
    }

    @Get('you-might-like')
    @UseGuards(OptionalJwtAuthGuard)
    async getYouMightLike(@Req() req: any, @Query('limit') limit?: string) {
        const userId = req.user?.id;
        if (!userId) {
            // Fallback for guests
            return RecommendationService.getTrendingProducts(limit ? parseInt(limit, 10) : 10);
        }
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return RecommendationService.getYouMightLike(userId, limitNum);
    }
}
