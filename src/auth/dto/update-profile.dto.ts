import { IsOptional, IsString, MinLength, IsBoolean, IsJSON } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @MinLength(2)
    firstName?: string;

    @IsString()
    @IsOptional()
    @MinLength(2)
    lastName?: string;

    @IsString()
    @IsOptional()
    phone?: string;

    // User Preferences
    @IsString()
    @IsOptional()
    language?: string;

    @IsString()
    @IsOptional()
    theme?: string;

    @IsString()
    @IsOptional()
    timeZone?: string;

    @IsString()
    @IsOptional()
    dateFormat?: string;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsOptional()
    notificationSettings?: any;
}
