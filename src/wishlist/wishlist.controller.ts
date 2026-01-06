import { Controller, Get, Post, Delete, Param, Query, UseGuards, Req, Body } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
    constructor(private readonly wishlistService: WishlistService) { }

    @Post()
    addToWishlist(@Req() req: any, @Body('productId') productId: string) {
        return this.wishlistService.addToWishlist(req.user.id, productId);
    }

    @Delete(':productId')
    removeFromWishlist(@Req() req: any, @Param('productId') productId: string) {
        return this.wishlistService.removeFromWishlist(req.user.id, productId);
    }

    @Get()
    getUserWishlist(
        @Req() req: any,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
    ) {
        return this.wishlistService.getUserWishlist(req.user.id, page, limit);
    }

    @Get('check/:productId')
    isInWishlist(@Req() req: any, @Param('productId') productId: string) {
        return this.wishlistService.isInWishlist(req.user.id, productId);
    }

    @Get('count')
    getWishlistCount(@Req() req: any) {
        return this.wishlistService.getWishlistCount(req.user.id);
    }
}
