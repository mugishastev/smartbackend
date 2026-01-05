import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createContactDto: CreateContactDto) {
        return this.prisma.contact.create({
            data: {
                ...createContactDto,
                status: 'PENDING',
            },
        });
    }

    async findAll() {
        return this.prisma.contact.findMany({
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.contact.findUnique({
            where: { id },
        });
    }
}
