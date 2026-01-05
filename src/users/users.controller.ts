import { Controller, Get, Param, Patch, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersQueryDto } from './dto/users-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get()
    findAll(@Query() query: UsersQueryDto) {
        return this.usersService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    @Patch(':id/activate')
    activate(@Param('id') id: string) {
        return this.usersService.activate(id);
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id') id: string) {
        return this.usersService.deactivate(id);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.usersService.remove(id);
    }
}
