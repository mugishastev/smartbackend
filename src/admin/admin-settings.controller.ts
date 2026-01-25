import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { AdminSettingsService } from './admin-settings.service';
import { UpdateSystemSettingsDto, UpdateCooperativeConfigDto, UpdateFinancialConfigDto } from './dto/admin-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminSettingsController {
    constructor(private readonly adminSettingsService: AdminSettingsService) { }

    // System Settings
    @Get('system')
    getSystemSettings() {
        return this.adminSettingsService.getSystemSettings();
    }

    @Put('system')
    updateSystemSettings(@Body() dto: UpdateSystemSettingsDto) {
        return this.adminSettingsService.updateSystemSettings(dto);
    }

    // Cooperative Config
    @Get('cooperative')
    getCooperativeConfig() {
        return this.adminSettingsService.getCooperativeConfig();
    }

    @Put('cooperative')
    updateCooperativeConfig(@Body() dto: UpdateCooperativeConfigDto) {
        return this.adminSettingsService.updateCooperativeConfig(dto);
    }

    // Financial Config
    @Get('financial')
    getFinancialConfig() {
        return this.adminSettingsService.getFinancialConfig();
    }

    @Put('financial')
    updateFinancialConfig(@Body() dto: UpdateFinancialConfigDto) {
        return this.adminSettingsService.updateFinancialConfig(dto);
    }

    // Activity Logs
    @Get('activity-logs')
    getActivityLogs(
        @Query('userId') userId?: string,
        @Query('action') action?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
    ) {
        return this.adminSettingsService.getActivityLogs({
            userId,
            action,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined,
        });
    }
}
