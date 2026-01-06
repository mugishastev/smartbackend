import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateConversationDto {
    @IsString()
    @IsNotEmpty()
    cooperativeId!: string;

    @IsString()
    @IsOptional()
    orderId?: string;

    @IsString()
    @IsOptional()
    subject?: string;
}
