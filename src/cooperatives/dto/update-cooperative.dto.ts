import { PartialType } from '@nestjs/mapped-types';
import { RegisterCooperativeDto } from './register-cooperative.dto';

export class UpdateCooperativeDto extends PartialType(RegisterCooperativeDto) { }
