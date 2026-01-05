import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class AcceptInvitationDto {
    @IsString()
    @IsNotEmpty()
    token!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password!: string;

    @IsString()
    @IsOptional()
    phone?: string;
}
