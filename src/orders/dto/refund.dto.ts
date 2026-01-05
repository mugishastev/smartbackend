import { IsNotEmpty, IsString } from 'class-validator';

export class RefundDto {
    @IsString()
    @IsNotEmpty()
    reason!: string;
}
