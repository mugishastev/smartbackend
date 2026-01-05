import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client'; // Use Prisma UserRole
import { AuthRequest } from '../middleware/auth.middleware';

@Controller('transactions')
// NestJS convention: maybe transactions controller at root `/transactions`?
// But endpoints are `POST /:cooperativeId` and `GET /:cooperativeId`.
// I will map it to `transactions`. The route in `routes/index.ts` was `app.use('/api/transactions', transactionRoutes)`.
// So path is `/transactions`.
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) { }

    @Post(':cooperativeId')
    @UseGuards(RolesGuard)
    // Legacy used `authorizeCooperative` middleware which checked if user belongs to coop AND has permissions (implied). 
    // Let's assume COOP_ADMIN and SECRETARY can create transactions, maybe others? Legacy didn't strictly limit role in controller, but middleware did.
    // I'll be permissive here or restrict to ADMIN/SECRETARY/ACCOUNTANT as per common sense.
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT)
    async createTransaction(
        @Param('cooperativeId') cooperativeId: string,
        @Body() dto: CreateTransactionDto,
        @Req() req: AuthRequest
    ) {
        // Basic check if user belongs to cooperative
        if (req.user!.cooperativeId !== cooperativeId && req.user!.role !== UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Not authorized for this cooperative');
        }
        return this.transactionsService.createTransaction(cooperativeId, dto, req.user!.id);
    }

    @Get(':cooperativeId')
    @UseGuards(RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY, UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN)
    async getTransactionsByCooperative(
        @Param('cooperativeId') cooperativeId: string,
        @Query() query: TransactionQueryDto,
        @Req() req: AuthRequest
    ) {
        if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.cooperativeId !== cooperativeId) {
            throw new ForbiddenException('Not authorized for this cooperative');
        }
        return this.transactionsService.getTransactionsByCooperative(cooperativeId, query);
    }

    @Get('transaction/:id')
    async getTransactionById(@Param('id') id: string, @Req() req: AuthRequest) {
        const transaction = await this.transactionsService.getTransactionById(id);

        // Check authorization
        // transaction has cooperativeId relation? Yes, included in service.
        // Wait, service returns transaction with relation `cooperative`.
        if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.cooperativeId !== transaction.cooperativeId) {
            throw new ForbiddenException('Not authorized');
        }
        return transaction;
    }
}
