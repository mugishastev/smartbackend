import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';

@Injectable()
export class AnnouncementsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, createAnnouncementDto: CreateAnnouncementDto) {
        return this.prisma.announcement.create({
            data: {
                ...createAnnouncementDto,
                postedBy: userId,
            },
        });
    }

    async findAll() {
        return this.prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            include: { cooperative: true },
        });
    }

    async findOne(id: string) {
        return this.prisma.announcement.findUnique({
            where: { id },
            include: { cooperative: true, applications: true },
        });
    }
}
