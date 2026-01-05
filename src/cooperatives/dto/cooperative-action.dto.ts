import { IsNotEmpty, IsString } from 'class-validator';

export class CooperativeActionDto {
    @IsString()
    @IsNotEmpty()
    reason!: string;
}
