import { Controller, Get, Post, Body, UseGuards, Req, Query } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Req() req: any, @Body() createRequestDto: CreateRequestDto) {
        return this.requestsService.create(req.user.id, createRequestDto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Query('cooperativeId') cooperativeId: string) {
        // Ideally check if user belongs to coop or is admin
        return this.requestsService.findAll(cooperativeId);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard)
    findMyRequests(@Req() req: any) {
        return this.requestsService.findMyRequests(req.user.id);
    }
}
