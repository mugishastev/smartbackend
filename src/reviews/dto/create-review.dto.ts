import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min, IsArray } from 'class-validator';

export class CreateReviewDto {
    @IsUUID()
    @IsNotEmpty()
    productId!: string;

    @IsUUID()
    @IsOptional()
    orderId?: string;

    @IsInt()
    @Min(1)
    @Max(5)
    @IsNotEmpty()
    rating!: number;

    @IsString()
    @IsOptional()
    comment?: string;

    @IsArray()
    @IsOptional()
    images?: string[];
}
