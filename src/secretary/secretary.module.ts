import { Module } from '@nestjs/common';
import { SecretaryController } from './secretary.controller';
import { SecretaryService } from './secretary.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SecretaryController],
    providers: [SecretaryService],
    exports: [SecretaryService],
})
export class SecretaryModule { }
