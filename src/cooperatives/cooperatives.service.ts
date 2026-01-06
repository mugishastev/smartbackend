import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterCooperativeDto } from './dto/register-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApproveCooperativeDto } from './dto/approve-cooperative.dto';
import { CreateCooperativeAdminDto } from './dto/create-admin.dto';
import { CooperativeActionDto } from './dto/cooperative-action.dto';
import { CooperativeQueryDto } from './dto/cooperative-query.dto';
import { UploadService } from '../common/services/upload.service';
import { EmailService } from '../common/services/email.service';
import { UserRole, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

@Injectable()
export class CooperativesService {
    constructor(private prisma: PrismaService) { }

    async register(
        dto: RegisterCooperativeDto,
        files: any,
    ) {
        const existing = await this.prisma.cooperative.findUnique({
            where: { registrationNumber: dto.registrationNumber },
        });

        if (existing) {
            throw new BadRequestException('Cooperative with this registration number already exists');
        }

        const existingEmail = await this.prisma.cooperative.findUnique({
            where: { email: dto.email },
        });

        if (existingEmail) {
            throw new BadRequestException('Cooperative with this email already exists');
        }

        let logo: string | undefined;
        let certificateUrl: string | undefined;
        let constitutionUrl: string | undefined;

        if (files) {
            if (files.logo) {
                logo = await UploadService.uploadImage(files.logo[0], 'cooperatives/logos');
            }
            if (files.certificate) {
                certificateUrl = await UploadService.uploadDocument(files.certificate[0], 'cooperatives/certificates');
            }
            if (files.constitution) {
                constitutionUrl = await UploadService.uploadDocument(files.constitution[0], 'cooperatives/constitutions');
            }
        }

        const cooperative = await this.prisma.cooperative.create({
            data: {
                ...dto,
                logo,
                certificateUrl,
                constitutionUrl,
                status: 'PENDING',
            },
        });

        return {
            message: 'Cooperative registration submitted successfully. Your application is pending approval.',
            cooperative: {
                id: cooperative.id,
                name: cooperative.name,
                email: cooperative.email,
                status: cooperative.status,
            },
        };
    }

    async create(
        userId: string,
        dto: RegisterCooperativeDto,
        files: any,
    ) {
        const existingUserCoop = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { cooperativeId: true },
        });

        if (existingUserCoop?.cooperativeId) {
            throw new BadRequestException('User is already associated with a cooperative');
        }

        const existing = await this.prisma.cooperative.findUnique({
            where: { registrationNumber: dto.registrationNumber },
        });

        if (existing) {
            throw new BadRequestException('Cooperative with this registration number already exists');
        }

        let logo: string | undefined;
        let certificateUrl: string | undefined;
        let constitutionUrl: string | undefined;

        if (files) {
            if (files.logo) {
                logo = await UploadService.uploadImage(files.logo[0], 'cooperatives/logos');
            }
            if (files.certificate) {
                certificateUrl = await UploadService.uploadDocument(files.certificate[0], 'cooperatives/certificates');
            }
            if (files.constitution) {
                constitutionUrl = await UploadService.uploadDocument(files.constitution[0], 'cooperatives/constitutions');
            }
        }

        return await this.prisma.$transaction(async (tx) => {
            const cooperative = await tx.cooperative.create({
                data: {
                    ...dto,
                    logo,
                    certificateUrl,
                    constitutionUrl,
                    status: 'PENDING',
                },
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    cooperativeId: cooperative.id,
                    role: UserRole.COOP_ADMIN,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: userId,
                    cooperativeId: cooperative.id,
                    action: 'COOPERATIVE_CREATED',
                    entity: 'COOPERATIVE',
                    entityId: cooperative.id,
                },
            });

            return cooperative;
        });
    }

    async findAll(query: CooperativeQueryDto) {
        const { status, type, page = 1, limit = 20 } = query;
        const where: Prisma.CooperativeWhereInput = {};

        if (status) where.status = status as any;
        if (type) where.type = type;

        const skip = (Number(page) - 1) * Number(limit);

        const [cooperatives, total] = await Promise.all([
            this.prisma.cooperative.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    _count: {
                        select: {
                            users: true,
                            products: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.cooperative.count({ where }),
        ]);

        return {
            cooperatives,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        };
    }

    async findOne(id: string) {
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        role: true,
                        avatar: true,
                    },
                },
                products: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: {
                        users: true,
                        products: true,
                        transactions: true,
                        announcements: true,
                    },
                },
            },
        });

        if (!cooperative) {
            throw new NotFoundException('Cooperative not found');
        }

        return cooperative;
    }

    async update(
        id: string,
        dto: UpdateCooperativeDto,
        userId: string,
        files: any,
    ) {
        const updateData: any = { ...dto };

        if (files) {
            if (files.logo) {
                updateData.logo = await UploadService.uploadImage(files.logo[0], 'cooperatives/logos');
            }
            if (files.certificate) {
                updateData.certificateUrl = await UploadService.uploadDocument(files.certificate[0], 'cooperatives/certificates');
            }
            if (files.constitution) {
                updateData.constitutionUrl = await UploadService.uploadDocument(files.constitution[0], 'cooperatives/constitutions');
            }
        }

        const cooperative = await this.prisma.cooperative.update({
            where: { id },
            data: updateData,
        });

        this.prisma.activityLog.create({
            data: {
                userId,
                cooperativeId: id,
                action: 'COOPERATIVE_UPDATED',
                entity: 'COOPERATIVE',
                entityId: id,
                details: updateData,
            },
        }).catch(console.error);

        return cooperative;
    }

    async approve(id: string, dto: ApproveCooperativeDto, adminId: string) {
        const cooperative = await this.prisma.cooperative.findUnique({ where: { id } });

        if (!cooperative) throw new NotFoundException('Cooperative not found');
        if (cooperative.status !== 'PENDING') throw new BadRequestException('Cooperative is not in pending status');

        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
        if (existingUser) throw new BadRequestException('A user with this email already exists');

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

        const result = await this.prisma.$transaction(async (tx) => {
            const updatedCooperative = await tx.cooperative.update({
                where: { id },
                data: {
                    status: 'APPROVED',
                    verifiedBy: adminId,
                    verifiedAt: new Date(),
                },
            });

            const adminUser = await tx.user.create({
                data: {
                    email: dto.adminEmail,
                    password: hashedPassword,
                    firstName: dto.adminFirstName,
                    lastName: dto.adminLastName,
                    role: UserRole.COOP_ADMIN,
                    cooperativeId: id,
                    isActive: true,
                    emailVerified: true,
                },
            });

            await tx.activityLog.create({
                data: {
                    userId: adminId,
                    cooperativeId: id,
                    action: 'COOPERATIVE_APPROVED',
                    entity: 'COOPERATIVE',
                    entityId: id,
                },
            });

            return { cooperative: updatedCooperative, admin: adminUser };
        });

        try {
            await EmailService.sendAdminCredentials(
                cooperative.email,
                dto.adminFirstName,
                cooperative.name,
                dto.adminEmail,
                dto.adminPassword
            );
        } catch (e) {
            console.error('Failed to send admin credentials email:', e);
        }

        return {
            message: 'Cooperative approved successfully',
            cooperative: result.cooperative,
            admin: {
                id: result.admin.id,
                email: result.admin.email,
            },
        };
    }

    async createAdmin(id: string, dto: CreateCooperativeAdminDto, superAdminId: string) {
        const cooperative = await this.prisma.cooperative.findUnique({
            where: { id },
            include: { users: { where: { role: UserRole.COOP_ADMIN } } },
        });

        if (!cooperative) throw new NotFoundException('Cooperative not found');
        if (cooperative.users.length > 0) throw new BadRequestException('An admin already exists');

        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
        if (existingUser) throw new BadRequestException('User with this email already exists');

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

        const adminUser = await this.prisma.user.create({
            data: {
                email: dto.adminEmail,
                password: hashedPassword,
                firstName: dto.adminFirstName,
                lastName: dto.adminLastName,
                role: UserRole.COOP_ADMIN,
                cooperativeId: id,
                isActive: true,
                emailVerified: true,
            },
        });

        this.prisma.activityLog.create({
            data: {
                userId: superAdminId,
                cooperativeId: id,
                action: 'ADMIN_CREATED',
                entity: 'USER',
                entityId: adminUser.id,
            },
        }).catch(console.error);

        try {
            await EmailService.sendAdminCredentials(
                cooperative.email,
                dto.adminFirstName,
                cooperative.name,
                cooperative.email,
                dto.adminPassword
            );
        } catch (e) {
            console.error(e);
        }

        return { message: 'Admin created', admin: adminUser };
    }

    async reject(id: string, dto: CooperativeActionDto, adminId: string) {
        const cooperative = await this.prisma.cooperative.update({
            where: { id },
            data: {
                status: 'REJECTED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
            },
        });

        this.prisma.activityLog.create({
            data: {
                userId: adminId,
                cooperativeId: id,
                action: 'COOPERATIVE_REJECTED',
                entity: 'COOPERATIVE',
                entityId: id,
                details: { reason: dto.reason },
            },
        }).catch(console.error);

        return cooperative;
    }

    async suspend(id: string, dto: CooperativeActionDto, adminId: string) {
        const existing = await this.prisma.cooperative.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Cooperative not found');
        if (existing.status === 'SUSPENDED') throw new BadRequestException('Already suspended');

        const cooperative = await this.prisma.cooperative.update({
            where: { id },
            data: { status: 'SUSPENDED' },
        });

        await this.prisma.user.updateMany({
            where: { cooperativeId: id },
            data: { isActive: false },
        });

        this.prisma.activityLog.create({
            data: {
                userId: adminId,
                cooperativeId: id,
                action: 'COOPERATIVE_SUSPENDED',
                entity: 'COOPERATIVE',
                entityId: id,
                details: { reason: dto.reason },
            },
        }).catch(console.error);

        return cooperative;
    }

    async unsuspend(id: string, dto: CooperativeActionDto, adminId: string) {
        const existing = await this.prisma.cooperative.findUnique({ where: { id } });
        if (!existing) throw new NotFoundException('Cooperative not found');
        if (existing.status !== 'SUSPENDED') throw new BadRequestException('Not suspended');

        const cooperative = await this.prisma.cooperative.update({
            where: { id },
            data: { status: 'APPROVED' },
        });

        await this.prisma.user.updateMany({
            where: { cooperativeId: id },
            data: { isActive: true },
        });

        this.prisma.activityLog.create({
            data: {
                userId: adminId,
                cooperativeId: id,
                action: 'COOPERATIVE_UNSUSPENDED',
                entity: 'COOPERATIVE',
                entityId: id,
                details: { reason: dto.reason },
            },
        }).catch(console.error);

        return cooperative;
    }

    async getDashboard(cooperativeId: string) {
        const [cooperative, stats] = await Promise.all([
            this.prisma.cooperative.findUnique({ where: { id: cooperativeId } }),
            this.prisma.$transaction([
                this.prisma.user.count({ where: { cooperativeId } }),
                this.prisma.product.count({ where: { cooperativeId } }),
                this.prisma.request.count({ where: { cooperativeId, status: 'PENDING' } }),
            ]),
        ]);

        if (!cooperative) throw new NotFoundException('Cooperative not found');

        const [totalMembers, totalProducts, pendingRequests] = stats;

        return {
            cooperative,
            stats: {
                totalMembers,
                totalProducts,
                pendingRequests,
            },
        };
    }

    async getFinancialSummary(cooperativeId: string) {
        const cooperative = await this.prisma.cooperative.findUnique({ where: { id: cooperativeId } });
        if (!cooperative) throw new NotFoundException('Cooperative not found');

        try {
            const [income, expenses] = await Promise.all([
                this.prisma.transaction.aggregate({
                    where: { cooperativeId, type: 'INCOME' },
                    _sum: { amount: true },
                }),
                this.prisma.transaction.aggregate({
                    where: { cooperativeId, type: 'EXPENSE' },
                    _sum: { amount: true },
                }),
            ]);

            const totalIncome = income._sum.amount || 0;
            const totalExpenses = expenses._sum.amount || 0;

            return {
                totalIncome,
                totalExpenses,
                netBalance: totalIncome - totalExpenses,
            };
        } catch (e) {
            // Fallback for DB connectivity issues
            return { totalIncome: 0, totalExpenses: 0, netBalance: 0 };
        }
    }
}
