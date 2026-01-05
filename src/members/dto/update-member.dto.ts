import { PartialType } from '@nestjs/mapped-types';
import { CreateMemberDto } from './create-member.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMemberDto extends PartialType(CreateMemberDto) {
    @IsBoolean()
    @IsOptional()
    isActive?: boolean;
}
