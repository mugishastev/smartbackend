import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Post('conversations')
    createConversation(@Req() req: any, @Body() dto: CreateConversationDto) {
        return this.chatService.ensureConversation({
            buyerId: req.user.id,
            cooperativeId: dto.cooperativeId,
            orderId: dto.orderId,
            subject: dto.subject,
        });
    }

    @Get('conversations')
    listConversations(@Req() req: any) {
        return this.chatService.listConversationsForUser({
            userId: req.user.id,
            role: req.user.role,
            cooperativeId: req.user.cooperativeId,
        });
    }

    @Get('conversations/:id/messages')
    getMessages(@Req() req: any, @Param('id') conversationId: string) {
        return this.chatService.getConversationMessages(conversationId, {
            userId: req.user.id,
            role: req.user.role,
            cooperativeId: req.user.cooperativeId,
        });
    }

    @Post('messages')
    sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
        return this.chatService.sendMessage({
            conversationId: dto.conversationId,
            senderId: req.user.id,
            receiverId: dto.receiverId,
            content: dto.content,
            attachments: dto.attachments,
        });
    }
}
