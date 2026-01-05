import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, Put } from '@nestjs/common';
import { OrdersService, ServiceUser } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { PaymentDto } from './dto/payment.dto';
import { RefundDto } from './dto/refund.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) { }

    @Post()
    async create(@Req() req: AuthRequest, @Body() dto: CreateOrderDto) {
        return this.ordersService.create(dto, req.user as ServiceUser, []);
    }

    @Get()
    async findAll(@Req() req: AuthRequest, @Query() query: OrderQueryDto) {
        return this.ordersService.findAll(query, req.user as ServiceUser);
    }

    @Get(':id')
    async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.ordersService.findOne(id, req.user as ServiceUser);
    }

    @Patch(':id/status')
    @UseGuards(RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY, UserRole.SUPER_ADMIN)
    async updateStatus(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
        return this.ordersService.updateStatus(id, dto, req.user as ServiceUser);
    }

    @Post(':id/pay')
    async processPayment(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: PaymentDto) {
        return this.ordersService.processPayment(id, dto, req.user as ServiceUser);
    }

    @Post(':id/retry-payment')
    async retryPayment(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: PaymentDto) {
        return this.ordersService.retryPayment(id, dto, req.user as ServiceUser);
    }

    @Post(':id/cancel')
    async cancelOrder(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.ordersService.cancelOrder(id, req.user as ServiceUser);
    }

    @Post(':id/refund')
    async requestRefund(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: RefundDto) {
        return this.ordersService.requestRefund(id, dto, req.user as ServiceUser);
    }
}
