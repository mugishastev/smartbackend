import { Module } from '@nestjs/common';
import { AccountantController } from './accountant.controller';
import { AccountantService } from './accountant.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [AccountantController],
    providers: [AccountantService],
    exports: [AccountantService],
})
export class AccountantModule { }
