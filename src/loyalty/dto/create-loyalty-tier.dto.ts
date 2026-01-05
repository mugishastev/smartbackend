import { IsNotEmpty, IsString, IsNumber, IsOptional, IsInt } from 'class-validator';

export class CreateLoyaltyTierDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    badge?: string;

    @IsNumber()
    @IsNotEmpty()
    minSpend!: number;

    @IsString()
    @IsOptional()
    benefits?: string;

    @IsString()
    @IsOptional()
    color?: string;

    @IsInt()
    @IsOptional()
    priority?: number;
}
