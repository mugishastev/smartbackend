import { Module } from '@nestjs/common';
import { ReturnService } from './returns.service';
import { ReturnsController } from './returns.controller';

@Module({
    controllers: [ReturnsController],
    providers: [ReturnService],
    exports: [ReturnService],
})
export class ReturnsModule { }
