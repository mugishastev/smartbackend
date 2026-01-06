import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('requests')
export class RequestsController {
    constructor(private readonly requestsService: RequestsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    create(@Body() createRequestDto: CreateRequestDto, @Req() req: any) {
        return this.requestsService.create(createRequestDto, req.user.id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    findAll(@Req() req: any) {
        if (
            req.user.cooperativeId &&
            (req.user.role === 'COOP_ADMIN' || req.user.role === 'SECRETARY')
        ) {
            return this.requestsService.findAllByCooperative(req.user.cooperativeId);
        }
        return this.requestsService.findAllMyRequests(req.user.id);
    }

    @Get('my')
    @UseGuards(JwtAuthGuard)
    findMyRequests(@Req() req: any) {
        return this.requestsService.findAllMyRequests(req.user.id);
    }
}
