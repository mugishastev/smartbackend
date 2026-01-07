import { MembersService } from './members.service';
import { Put, Req, Controller, Post, Body, UseGuards, Get, Query, Delete, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { InviteMemberDto } from './dto/invite-member.dto';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { MemberQueryDto } from './dto/member-query.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { CSVService } from '../common/services/csv.service';
import { AuthRequest } from '../middleware/auth.middleware';

@Controller('members')
export class MembersController {
    constructor(private readonly membersService: MembersService) { }

    @Post('accept-invitation')
    async acceptInvitation(@Body() dto: AcceptInvitationDto) {
        return this.membersService.acceptInvitation(dto);
    }

    @Post('invite')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    async invite(@Req() req: AuthRequest, @Body() dto: InviteMemberDto) {
        return this.membersService.inviteMember(req.user!.cooperativeId!, req.user!.id, dto);
    }

    @Post('import')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN)
    @UseInterceptors(FileInterceptor('file'))
    async import(@Req() req: AuthRequest, @UploadedFile() file: any) {
        if (!file) { return; }
        return this.membersService.importMembers(req.user!.cooperativeId!, req.user!.id, file.buffer);
    }

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN)
    async create(@Req() req: AuthRequest, @Body() dto: CreateMemberDto) {
        return this.membersService.create(req.user!.cooperativeId!, req.user!.id, dto);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async findAll(@Req() req: AuthRequest, @Query() query: MemberQueryDto) {
        return this.membersService.findAll(req.user!.cooperativeId!, query);
    }

    @Get('invitations')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    async getPendingInvitations(@Req() req: AuthRequest) {
        return this.membersService.getPendingInvitations(req.user!.cooperativeId!);
    }

    @Delete('invitations/:id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY)
    async cancelInvitation(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.cancelInvitation(id, req.user!.cooperativeId!);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async findOne(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.findOne(id, req.user!);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SECRETARY, UserRole.SUPER_ADMIN)
    async update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateMemberDto) {
        return this.membersService.update(id, req.user!, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.COOP_ADMIN, UserRole.SUPER_ADMIN)
    async remove(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.remove(id, req.user!);
    }

    @Get(':id/financials')
    @UseGuards(JwtAuthGuard)
    async getFinancials(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.getFinancials(id, req.user!);
    }

    @Get(':id/dashboard')
    @UseGuards(JwtAuthGuard)
    async getDashboard(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.getDashboard(id, req.user!);
    }

    @Get(':id/contributions')
    @UseGuards(JwtAuthGuard)
    async getContributions(@Req() req: AuthRequest, @Param('id') id: string, @Query('period') period?: string) {
        return this.membersService.getContributions(id, parseInt(period || '12'), req.user!);
    }

    @Get(':id/loans')
    @UseGuards(JwtAuthGuard)
    async getLoans(@Req() req: AuthRequest, @Param('id') id: string) {
        return this.membersService.getLoans(id, req.user!);
    }
}
