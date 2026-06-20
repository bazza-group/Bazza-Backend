import { IsNumber, IsOptional } from 'class-validator';

export class CreatePrecificacaoDto {
  @IsNumber()
  distanciaKm!: number;

  @IsOptional()
  @IsNumber()
  tempoEstimadoMin?: number;

  @IsOptional()
  @IsNumber()
  pesoKg?: number;
}
