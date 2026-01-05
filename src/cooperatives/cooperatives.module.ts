import { Module } from '@nestjs/common';
import { CooperativesService } from './cooperatives.service';
import { CooperativesController } from './cooperatives.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CooperativesController],
    providers: [CooperativesService],
    exports: [CooperativesService],
})
export class CooperativesModule { }
