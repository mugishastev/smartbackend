import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { ReturnService } from './returns.service';

@Controller('returns')
export class ReturnsController {
    constructor(private readonly returnService: ReturnService) { }

    @Post()
    async create(@Body() dto: any) {
        const { buyerId, orderId, productId, orderItemId, reason, description, images } = dto;
        return this.returnService.createReturnRequest(buyerId, orderId, productId, orderItemId, reason, description, images);
    }

    @Get()
    async getAll(
        @Query('userId') userId: string,
        @Query('role') role: string,
        @Query('cooperativeId') cooperativeId?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.returnService.getReturnRequests(userId, role, cooperativeId, page, limit);
    }

    @Get(':id')
    async getById(@Param('id') id: string, @Query('userId') userId: string, @Query('role') role: string) {
        return this.returnService.getReturnRequestById(id, userId, role);
    }

    @Put(':id/approve')
    async approve(@Param('id') id: string, @Body('processedBy') processedBy: string, @Body('role') role: string, @Body('cooperativeId') cooperativeId?: string) {
        return this.returnService.approveReturn(id, processedBy, role, cooperativeId);
    }

    @Put(':id/reject')
    async reject(@Param('id') id: string, @Body('processedBy') processedBy: string, @Body('rejectionReason') rejectionReason: string, @Body('role') role: string) {
        return this.returnService.rejectReturn(id, processedBy, rejectionReason, role);
    }

    @Post(':id/refund')
    async refund(@Param('id') id: string, @Body('refundRef') refundRef: string, @Body('processedBy') processedBy: string) {
        return this.returnService.processRefund(id, refundRef, processedBy);
    }

    @Post(':id/cancel')
    async cancel(@Param('id') id: string, @Body('userId') userId: string) {
        return this.returnService.cancelReturn(id, userId);
    }
}
