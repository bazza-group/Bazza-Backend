import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum PrioridadeSuporte {
  BAIXA = 'baixa',
  MEDIA = 'media',
  ALTA = 'alta',
  URGENTE = 'urgente',
}

export class CreateSuporteDto {
  @IsString()
  titulo!: string;

  @IsString()
  descricao!: string;

  @IsOptional()
  @IsEnum(PrioridadeSuporte)
  prioridade?: PrioridadeSuporte = PrioridadeSuporte.MEDIA;

  @IsOptional()
  @IsString()
  categoria?: string;
}
