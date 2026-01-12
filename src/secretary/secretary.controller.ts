import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { SecretaryService } from './secretary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('secretary')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SECRETARY, UserRole.SUPER_ADMIN, UserRole.COOP_ADMIN)
export class SecretaryController {
    constructor(private readonly secretaryService: SecretaryService) { }

    @Get('dashboard/:cooperativeId')
    async getDashboard(@Param('cooperativeId') cooperativeId: string) {
        return this.secretaryService.getDashboard(cooperativeId);
    }

    @Get('pending-approvals/:cooperativeId')
    async getPendingApprovals(@Param('cooperativeId') cooperativeId: string) {
        return this.secretaryService.getPendingApprovals(cooperativeId);
    }

    @Post('approvals/:id/approve')
    async approveTransaction(@Param('id') id: string) {
        return this.secretaryService.approveTransaction(id);
    }

    @Post('approvals/:id/reject')
    async rejectTransaction(@Param('id') id: string) {
        return this.secretaryService.rejectTransaction(id);
    }
}
