import { Module } from '@nestjs/common';
import { RegulatorController } from './regulator.controller';
import { RegulatorService } from './regulator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [RegulatorController],
    providers: [RegulatorService],
    exports: [RegulatorService],
})
export class RegulatorModule { }
