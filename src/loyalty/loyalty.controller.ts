import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { CreateLoyaltyTierDto } from './dto/create-loyalty-tier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('loyalty')
export class LoyaltyController {
    constructor(private readonly loyaltyService: LoyaltyService) { }

    @Post('tiers')
    @UseGuards(JwtAuthGuard)
    createTier(@Body() createLoyaltyTierDto: CreateLoyaltyTierDto) {
        return this.loyaltyService.createTier(createLoyaltyTierDto);
    }

    @Get('tiers')
    findAllTiers() {
        return this.loyaltyService.findAllTiers();
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMyLoyalty(@Req() req: any) {
        return this.loyaltyService.getUserLoyalty(req.user.id);
    }
}
