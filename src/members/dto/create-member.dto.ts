import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateMemberDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    firstName!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    lastName!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @IsOptional()
    role?: UserRole = UserRole.MEMBER;

    @IsString()
    @IsOptional()
    idNumber?: string;

    @IsString()
    @IsOptional()
    village?: string;
}
