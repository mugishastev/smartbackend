import { IsOptional, IsString, IsNumber, IsBooleanString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsString()
    cooperativeId?: string;

    @IsOptional()
    @IsString()
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    @Type(() => Number)
    minPrice?: number;

    @IsOptional()
    @Type(() => Number)
    maxPrice?: number;

    @IsOptional()
    @IsString()
    quality?: string;

    @IsOptional()
    @IsString()
    location?: string;

    @IsOptional()
    @IsString()
    sortBy?: string; // recent, price-low, price-high, name

    @IsOptional()
    @IsBooleanString()
    inStock?: string;
}
