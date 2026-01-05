import { IsNotEmpty, IsString, IsOptional, IsEnum, IsNumber, IsDateString } from 'class-validator';
import { CampaignType, CampaignStatus, DiscountType } from '@prisma/client';

export class CreateCampaignDto {
    @IsString()
    @IsNotEmpty()
    name!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(CampaignType)
    @IsOptional()
    type?: CampaignType;

    @IsEnum(CampaignStatus)
    @IsOptional()
    status?: CampaignStatus;

    @IsDateString()
    @IsOptional()
    startDate?: string;

    @IsDateString()
    @IsOptional()
    endDate?: string;

    @IsNumber()
    @IsOptional()
    discountValue?: number;

    @IsEnum(DiscountType)
    @IsOptional()
    discountType?: DiscountType;

    @IsString()
    @IsOptional()
    cooperativeId?: string;
}
