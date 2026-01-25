import { IsOptional, IsString, IsBoolean, IsNumber, IsArray } from 'class-validator';

export class UpdateSystemSettingsDto {
    @IsString()
    @IsOptional()
    platformName?: string;

    @IsString()
    @IsOptional()
    platformLogo?: string;

    @IsString()
    @IsOptional()
    defaultLanguage?: string;

    @IsBoolean()
    @IsOptional()
    maintenanceMode?: boolean;

    @IsString()
    @IsOptional()
    maintenanceMessage?: string;

    @IsOptional()
    apiKeys?: any;

    @IsOptional()
    brandingConfig?: any;
}

export class UpdateCooperativeConfigDto {
    @IsBoolean()
    @IsOptional()
    autoApprovalEnabled?: boolean;

    @IsArray()
    @IsOptional()
    requiredDocuments?: string[];

    @IsNumber()
    @IsOptional()
    minMembers?: number;

    @IsNumber()
    @IsOptional()
    maxMembers?: number;

    @IsNumber()
    @IsOptional()
    registrationFee?: number;

    @IsOptional()
    approvalWorkflow?: any;
}

export class UpdateFinancialConfigDto {
    @IsNumber()
    @IsOptional()
    platformFeePercent?: number;

    @IsNumber()
    @IsOptional()
    commissionRate?: number;

    @IsNumber()
    @IsOptional()
    minTransactionLimit?: number;

    @IsNumber()
    @IsOptional()
    maxTransactionLimit?: number;

    @IsOptional()
    payoutRules?: any;

    @IsArray()
    @IsOptional()
    paymentMethods?: string[];
}
