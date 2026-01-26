import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactQueryDto } from './dto/contact-query.dto';

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
}
