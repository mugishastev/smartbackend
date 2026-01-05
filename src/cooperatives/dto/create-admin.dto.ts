import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateCooperativeAdminDto {
    @IsEmail()
    @IsNotEmpty()
    adminEmail!: string;

    @IsString()
    @IsNotEmpty()
    adminFirstName!: string;

    @IsString()
    @IsNotEmpty()
    adminLastName!: string;

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    adminPassword!: string;
}
