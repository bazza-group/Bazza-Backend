import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PrioridadeSuporte } from './create-suporte.dto';

export enum StatusSuporte {
  ABERTO = 'aberto',
  EM_ANALISE = 'em_analise',
  RESOLVIDO = 'resolvido',
  FECHADO = 'fechado',
}

export class UpdateSuporteDto {
  @IsOptional()
  @IsString()
  titulo?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsEnum(PrioridadeSuporte)
  prioridade?: PrioridadeSuporte;

  @IsOptional()
  @IsEnum(StatusSuporte)
  status?: StatusSuporte;

  @IsOptional()
  @IsString()
  categoria?: string;
}
