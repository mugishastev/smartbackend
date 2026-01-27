import { IsString, IsNotEmpty } from 'class-validator';

export class RespondContactDto {
    @IsString()
    @IsNotEmpty()
    response!: string;
}
