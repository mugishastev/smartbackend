import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionStatus } from '../../lib/enums';

export class TransactionQueryDto {
    @IsEnum(TransactionStatus)
    @IsOptional()
    status?: TransactionStatus;

    @IsString()
    @IsOptional()
    type?: string;

    @IsString()
    @IsOptional()
    userId?: string;

    @Type(() => Date)
    @IsOptional()
    startDate?: Date;

    @Type(() => Date)
    @IsOptional()
    endDate?: Date;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @IsOptional()
    page?: number = 1;

    @Type(() => Number)
    @IsNumber()
    @Min(1)
    @IsOptional()
    limit?: number = 20;
}
