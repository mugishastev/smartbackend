import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    firstName?: string;

    @IsString()
    @IsOptional()
    @MinLength(2)
    lastName?: string;

    @IsString()
    @IsOptional()
    phone?: string;
}
