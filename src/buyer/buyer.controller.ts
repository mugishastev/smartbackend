import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { BuyerService } from './buyer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('buyer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BUYER, UserRole.SUPER_ADMIN)
export class BuyerController {
    constructor(private readonly buyerService: BuyerService) { }

    @Get('stats')
    getStats(@Req() req: any) {
        return this.buyerService.getStats(req.user.id);
    }

    @Get('orders')
    getOrders(@Req() req: any, @Query('limit') limit?: number) {
        return this.buyerService.getOrders(req.user.id, limit);
    }
}
