import { Controller, Get, Post, Body, Param, Query, Put, UseGuards } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';
import { RespondContactDto } from './dto/respond-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('contacts')
export class ContactsController {
    constructor(private readonly contactsService: ContactsService) { }

    @Post()
    create(@Body() createContactDto: CreateContactDto) {
        return this.contactsService.create(createContactDto);
    }

    @Get()
    findAll(@Query() query: ContactQueryDto) {
        return this.contactsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.contactsService.findOne(id);
    }

    @Put(':id/respond')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    respond(
        @Param('id') id: string,
        @Body() dto: RespondContactDto,
    ) {
        return this.contactsService.respond(id, dto.response);
    }
}
