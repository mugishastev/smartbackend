import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class SendMessageDto {
    @IsString()
    @IsNotEmpty()
    conversationId!: string;

    @IsString()
    @IsNotEmpty()
    receiverId!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsArray()
    @IsOptional()
    attachments?: string[];
}
