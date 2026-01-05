import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentDto {
    @IsString()
    @IsNotEmpty()
    phoneNumber!: string;
}
