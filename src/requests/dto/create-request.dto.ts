import { IsNotEmpty, IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateRequestDto {
    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsNotEmpty()
    cooperativeId!: string;
}
