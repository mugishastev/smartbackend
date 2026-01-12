import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiError } from '../lib/ApiError';
import { CooperativeStatus } from '@prisma/client';

@Injectable()
export class RegulatorService {
    constructor(private readonly prisma: PrismaService) { }

    async getDashboard() {
        // Get statistics for regulator dashboard
        const [
            totalCooperatives,
            pendingApprovals,
            activeCompliance,
            totalReports,
        ] = await Promise.all([
            this.prisma.cooperative.count(),
            this.prisma.cooperative.count({
                where: {
                    status: CooperativeStatus.PENDING,
                },
            }),
            this.prisma.cooperative.count({
                where: {
                    status: CooperativeStatus.APPROVED,
                },
            }),
            this.prisma.report.count(),
        ]);

        return {
            stats: {
                totalCooperatives,
                pendingApprovals,
                activeCompliance,
                totalReports,
            },
        };
    }

    async getPendingReviews() {
        // Get cooperatives pending approval
        const pendingCooperatives = await this.prisma.cooperative.findMany({
            where: {
                status: CooperativeStatus.PENDING,
            },
            include: {
                _count: {
                    select: {
                        users: true,
                        products: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Transform to match frontend expectations
        const reviews = pendingCooperatives.map(coop => ({
            id: coop.id,
            cooperativeName: coop.name,
            type: 'REGISTRATION' as const,
            priority: coop._count.users > 50 ? 'HIGH' : coop._count.users > 20 ? 'MEDIUM' : 'LOW',
            submittedAt: coop.createdAt.toISOString(),
            description: `${coop.type} cooperative with ${coop._count.users} members in ${coop.district}, ${coop.sector}`,
            status: coop.status,
        }));

        return { reviews };
    }

    async updateReviewStatus(
        cooperativeId: string,
        status: 'APPROVED' | 'REJECTED',
        comment?: string
    ) {
        // Get cooperative
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id: cooperativeId },
        });

        if (!cooperative) {
            throw new ApiError(404, 'Cooperative not found');
        }

        // Update cooperative status
        const updatedCooperative = await this.prisma.cooperative.update({
            where: { id: cooperativeId },
            data: {
                status: status === 'APPROVED' ? CooperativeStatus.APPROVED : CooperativeStatus.REJECTED,
                verifiedAt: new Date(),
                verifiedBy: 'regulator', // In real implementation, get from request context
            },
        });

        // Log activity
        await this.prisma.activityLog.create({
            data: {
                userId: 'system', // In real implementation, get from request context
                cooperativeId,
                action: `COOPERATIVE_${status}`,
                entity: 'COOPERATIVE',
                entityId: cooperativeId,
                details: {
                    comment: comment || 'No comment provided',
                    previousStatus: cooperative.status,
                    newStatus: updatedCooperative.status,
                },
            },
        });

        return {
            message: `Cooperative ${status.toLowerCase()} successfully`,
        };
    }
}
