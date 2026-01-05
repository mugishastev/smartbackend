import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { EmailService } from '../services/email.service';

@Injectable()
export class ContactsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(createContactDto: CreateContactDto) {
        const contact = await this.prisma.contact.create({
            data: {
                ...createContactDto,
                status: 'PENDING',
            },
        });

        try {
            await EmailService.sendContactConfirmationEmail(contact.email, contact.name);
        } catch (error) {
            console.error('Failed to send contact confirmation email:', error);
        }

        return contact;
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
