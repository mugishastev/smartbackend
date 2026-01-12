import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { AccountantService } from './accountant.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('accountant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ACCOUNTANT, UserRole.SUPER_ADMIN, UserRole.COOP_ADMIN)
export class AccountantController {
    constructor(private readonly accountantService: AccountantService) { }

    @Get('dashboard/:cooperativeId')
    async getDashboard(@Param('cooperativeId') cooperativeId: string) {
        return this.accountantService.getDashboard(cooperativeId);
    }

    @Get('financial-summary/:cooperativeId')
    async getFinancialSummary(@Param('cooperativeId') cooperativeId: string) {
        return this.accountantService.getFinancialSummary(cooperativeId);
    }

    @Get('reports/:cooperativeId/:type')
    async generateReport(
        @Param('cooperativeId') cooperativeId: string,
        @Param('type') type: 'monthly' | 'quarterly' | 'annual'
    ) {
        return this.accountantService.generateFinancialReport(cooperativeId, type);
    }
}
