import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CooperativeStatus } from '../lib/enums';

@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('cooperatives')
    async getAllCooperatives(@Query('search') search?: string, @Query('status') status?: string) {
        return this.adminService.findAllCooperatives(search, status);
    }

    @Post('cooperatives/:id/status')
    async manageCooperativeStatus(
        @Param('id') id: string,
        @Body('status') status: CooperativeStatus,
        @Body('remarks') remarks?: string
    ) {
        return this.adminService.manageCooperativeStatus(id, status, remarks);
    }

    @Get('analytics/dashboard')
    async getDashboardAnalytics() {
        return this.adminService.getDashboardAnalytics();
    }

    @Get('reports/financial')
    async getFinancialReport(@Query('period') period: string) {
        return this.adminService.generatePlatformFinancialReport(period, 'admin');
    }

    @Get('reports/users')
    async getUserReport(@Query('period') period: string) {
        return this.adminService.generatePlatformUserReport(period, 'admin');
    }

    @Get('reports/cooperatives')
    async getCooperativeReport(@Query('period') period: string) {
        return this.adminService.generatePlatformCooperativeReport(period, 'admin');
    }

    @Get('reports/performance')
    async getPerformanceReport(@Query('period') period: string) {
        return this.adminService.generatePlatformPerformanceReport(period, 'admin');
    }
}
