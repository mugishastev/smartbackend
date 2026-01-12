import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { RegulatorService } from './regulator.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('regulator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RCA_REGULATOR, UserRole.SUPER_ADMIN)
export class RegulatorController {
    constructor(private readonly regulatorService: RegulatorService) { }

    @Get('dashboard')
    async getDashboard() {
        return this.regulatorService.getDashboard();
    }

    @Get('pending-reviews')
    async getPendingReviews() {
        return this.regulatorService.getPendingReviews();
    }

    @Put('reviews/:id')
    async updateReviewStatus(
        @Param('id') id: string,
        @Body('status') status: 'APPROVED' | 'REJECTED',
        @Body('comment') comment?: string
    ) {
        return this.regulatorService.updateReviewStatus(id, status, comment);
    }
}
