import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class CreateReportDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    type!: string;

    @IsString()
    @IsNotEmpty()
    period!: string;

    @IsObject()
    @IsNotEmpty()
    content!: any;

    @IsString()
    @IsNotEmpty()
    cooperativeId!: string;
}
