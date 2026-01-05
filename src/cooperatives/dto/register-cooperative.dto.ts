import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterCooperativeDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name!: string;

    @IsString()
    @IsNotEmpty()
    registrationNumber!: string;

    @IsEmail()
    @IsNotEmpty()
    email!: string;

    @IsString()
    @IsNotEmpty()
    phone!: string;

    @IsString()
    @IsNotEmpty()
    address!: string;

    @IsString()
    @IsNotEmpty()
    district!: string;

    @IsString()
    @IsNotEmpty()
    sector!: string;

    @IsString()
    @IsNotEmpty()
    cell!: string;

    @IsString()
    @IsNotEmpty()
    village!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    foundedDate?: string;
}
