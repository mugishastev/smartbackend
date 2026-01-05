import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, ShippingMethod } from '../../lib/enums';

class OrderItemDto {
    @IsUUID()
    @IsNotEmpty()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

class ShippingInfoDto {
    @IsString()
    @IsNotEmpty()
    fullName!: string;

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
    @IsOptional()
    deliveryNotes?: string;
}

export class CreateOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];

    @ValidateNested()
    @Type(() => ShippingInfoDto)
    @IsNotEmpty()
    shippingInfo!: ShippingInfoDto;

    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod = PaymentMethod.CASH_ON_DELIVERY;

    @IsString()
    @IsOptional()
    notes?: string;

    @IsEnum(ShippingMethod)
    @IsOptional()
    shippingMethod?: ShippingMethod;
}
