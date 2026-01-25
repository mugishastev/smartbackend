import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSystemSettingsDto, UpdateCooperativeConfigDto, UpdateFinancialConfigDto } from './dto/admin-settings.dto';

@Injectable()
export class AdminSettingsService {
    constructor(private prisma: PrismaService) { }

    // System Settings
    async getSystemSettings() {
        let settings = await this.prisma.systemSettings.findFirst();

        // Create default settings if none exist
        if (!settings) {
            settings = await this.prisma.systemSettings.create({
                data: {},
            });
        }

        return { settings };
    }

    async updateSystemSettings(dto: UpdateSystemSettingsDto) {
        let settings = await this.prisma.systemSettings.findFirst();

        if (!settings) {
            settings = await this.prisma.systemSettings.create({
                data: dto,
            });
        } else {
            settings = await this.prisma.systemSettings.update({
                where: { id: settings.id },
                data: dto,
            });
        }

        return { message: 'System settings updated successfully', settings };
    }

    // Cooperative Config
    async getCooperativeConfig() {
        let config = await this.prisma.cooperativeConfig.findFirst();

        if (!config) {
            config = await this.prisma.cooperativeConfig.create({
                data: {},
            });
        }

        return { config };
    }

    async updateCooperativeConfig(dto: UpdateCooperativeConfigDto) {
        let config = await this.prisma.cooperativeConfig.findFirst();

        if (!config) {
            config = await this.prisma.cooperativeConfig.create({
                data: dto,
            });
        } else {
            config = await this.prisma.cooperativeConfig.update({
                where: { id: config.id },
                data: dto,
            });
        }

        return { message: 'Cooperative configuration updated successfully', config };
    }

    // Financial Config
    async getFinancialConfig() {
        let config = await this.prisma.financialConfig.findFirst();

        if (!config) {
            config = await this.prisma.financialConfig.create({
                data: {},
            });
        }

        return { config };
    }

    async updateFinancialConfig(dto: UpdateFinancialConfigDto) {
        let config = await this.prisma.financialConfig.findFirst();

        if (!config) {
            config = await this.prisma.financialConfig.create({
                data: dto,
            });
        } else {
            config = await this.prisma.financialConfig.update({
                where: { id: config.id },
                data: dto,
            });
        }

        return { message: 'Financial configuration updated successfully', config };
    }

    // Activity Logs (for Audit section)
    async getActivityLogs(filters?: { userId?: string; action?: string; limit?: number; offset?: number }) {
        const where: any = {};

        if (filters?.userId) where.userId = filters.userId;
        if (filters?.action) where.action = filters.action;

        const logs = await this.prisma.activityLog.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: filters?.limit || 50,
            skip: filters?.offset || 0,
        });

        const total = await this.prisma.activityLog.count({ where });

        return { logs, total };
    }
}
