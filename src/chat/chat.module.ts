import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    imports: [NotificationsModule],
    controllers: [ChatController],
    providers: [ChatService, PrismaService],
    exports: [ChatService],
})
export class ChatModule { }
