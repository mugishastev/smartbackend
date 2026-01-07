import {
    Controller,
    Get,
    Post,
    Body,
    Put,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFiles,
    Query,
    Req,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nest-lab/fastify-multer';
import { CooperativesService } from './cooperatives.service';
import { RegisterCooperativeDto } from './dto/register-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { ApproveCooperativeDto } from './dto/approve-cooperative.dto';
import { CreateCooperativeAdminDto } from './dto/create-admin.dto';
import { CooperativeActionDto } from './dto/cooperative-action.dto';
import { CooperativeQueryDto } from './dto/cooperative-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('cooperatives')
export class CooperativesController {
    constructor(private readonly cooperativesService: CooperativesService) { }

    @Post('register')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'certificate', maxCount: 1 },
            { name: 'constitution', maxCount: 1 },
        ]),
    )
    register(
        @Body() dto: RegisterCooperativeDto,
        @UploadedFiles() files?: any,
    ) {
        return this.cooperativesService.register(dto, files);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'certificate', maxCount: 1 },
            { name: 'constitution', maxCount: 1 },
        ]),
    )
    create(
        @Req() req: any,
        @Body() dto: RegisterCooperativeDto,
        @UploadedFiles() files?: any,
    ) {
        return this.cooperativesService.create(req.user.id, dto, files);
    }

    @Get()
    findAll(@Query() query: CooperativeQueryDto) {
        return this.cooperativesService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.cooperativesService.findOne(id);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SUPER_ADMIN)
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'logo', maxCount: 1 },
            { name: 'certificate', maxCount: 1 },
            { name: 'constitution', maxCount: 1 },
        ]),
    )
    update(
        @Param('id') id: string,
        @Body() dto: UpdateCooperativeDto,
        @Req() req: any,
        @UploadedFiles() files?: any,
    ) {
        return this.cooperativesService.update(id, dto, req.user.id, files);
    }

    @Post(':id/approve')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    approve(
        @Param('id') id: string,
        @Body() dto: ApproveCooperativeDto,
        @Req() req: any,
    ) {
        return this.cooperativesService.approve(id, dto, req.user.id);
    }

    @Post(':id/create-admin')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    createAdmin(
        @Param('id') id: string,
        @Body() dto: CreateCooperativeAdminDto,
        @Req() req: any,
    ) {
        return this.cooperativesService.createAdmin(id, dto, req.user.id);
    }

    @Post(':id/reject')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    reject(
        @Param('id') id: string,
        @Body() dto: CooperativeActionDto,
        @Req() req: any,
    ) {
        return this.cooperativesService.reject(id, dto, req.user.id);
    }

    @Post(':id/suspend')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    suspend(
        @Param('id') id: string,
        @Body() dto: CooperativeActionDto,
        @Req() req: any,
    ) {
        return this.cooperativesService.suspend(id, dto, req.user.id);
    }

    @Post(':id/unsuspend')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.SUPER_ADMIN)
    unsuspend(
        @Param('id') id: string,
        @Body() dto: CooperativeActionDto,
        @Req() req: any,
    ) {
        return this.cooperativesService.unsuspend(id, dto, req.user.id);
    }

    @Get(':id/dashboard')
    @UseGuards(JwtAuthGuard)
    getDashboard(@Param('id') id: string) {
        return this.cooperativesService.getDashboard(id);
    }

    @Get(':id/financial-summary')
    @UseGuards(JwtAuthGuard)
    getFinancialSummary(@Param('id') id: string) {
        return this.cooperativesService.getFinancialSummary(id);
    }
}
