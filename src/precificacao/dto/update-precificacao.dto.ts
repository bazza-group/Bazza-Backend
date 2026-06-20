import { PartialType } from '@nestjs/mapped-types';
import { CreatePrecificacaoDto } from './create-precificacao.dto';

export class UpdatePrecificacaoDto extends PartialType(CreatePrecificacaoDto) {}
