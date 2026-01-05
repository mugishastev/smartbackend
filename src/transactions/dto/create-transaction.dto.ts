import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { TransactionType } from '../../lib/enums';

export class CreateTransactionDto {
    @IsEnum(TransactionType)
    @IsNotEmpty()
    type!: TransactionType;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount!: number;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    reference?: string;
}
