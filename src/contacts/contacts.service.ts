import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { EmailService } from '../common/services/email.service';

@Injectable()
export class ContactsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly emailService: EmailService,
    ) { }

    async create(createContactDto: CreateContactDto) {
        const contact = await this.prisma.contact.create({
            data: {
                ...createContactDto,
                status: 'PENDING',
            },
        });

        try {
            await this.emailService.sendContactConfirmationEmail(contact.email, contact.name);
        } catch (error) {
            console.error('Failed to send contact confirmation email:', error);
        }

        return contact;
    }

    async findAll(query: any = {}) {
        const { status, page = 1, limit = 20 } = query;
        const where: any = {};

        if (status && status !== 'ALL') {
            where.status = status;
        }

        const skip = (Number(page) - 1) * Number(limit);

        const [contacts, total] = await Promise.all([
            this.prisma.contact.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.contact.count({ where }),
        ]);

        return {
            contacts,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            }
        };
    }

    async findOne(id: string) {
        return this.prisma.contact.findUnique({
            where: { id },
        });
    }

    async respond(id: string, response: string) {
        const contact = await this.prisma.contact.findUnique({
            where: { id },
        });

        if (!contact) {
            throw new NotFoundException('Contact inquiry not found');
        }

        const updatedContact = await this.prisma.contact.update({
            where: { id },
            data: {
                response,
                status: 'RESPONDED',
                respondedAt: new Date(),
            },
        });

        try {
            await this.emailService.sendContactResponseEmail(
                contact.email,
                contact.name,
                contact.message,
                response,
                'Super Admin'
            );
        } catch (error) {
            console.error('Failed to send contact response email:', error);
        }

        return updatedContact;
    }
}
