import { IsNotEmpty, IsString, MinLength, IsNumber, IsPositive, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name!: string;

    @IsString()
    @IsNotEmpty()
    description!: string;

    @IsString()
    @IsNotEmpty()
    category!: string;

    @IsNumber()
    @IsPositive()
    @Type(() => Number)
    price!: number;

    @IsString()
    @IsNotEmpty()
    unit!: string;

    @IsNumber()
    @Min(0)
    @Type(() => Number)
    availableStock!: number;

    @IsString()
    @IsOptional()
    quality?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    @Type(() => Number)
    shippingCost?: number; // Optional can stay optional or use ! if logic ensures it. But wait, strictPropertyInitialization. Optional properties don't need ! if they are truly optional (undefined).
    // The error usually comes for non-optional properties not initialized.
    // Let's check UpdateProductDto again. It extends PartialType. It should be fine if CreateProductDto is fine.
    // The error snippet mentioned sector: string. That's likely ShippingInfo inside CreateOrderDto!

}
