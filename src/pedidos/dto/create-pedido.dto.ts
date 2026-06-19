import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarPedidoDto {
  @ApiProperty({ example: 'Rua da Samba, Luanda' })
  @IsString()
  @IsNotEmpty()
  origemEndereco: string;

  @ApiProperty({ example: -8.8383 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  origemLatitude: number;

  @ApiProperty({ example: 13.2344 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  origemLongitude: number;

  @ApiPropertyOptional({ example: 'Porta azul, tocar campainha' })
  @IsOptional()
  @IsString()
  origemInstrucoes?: string;

  @ApiProperty({ example: 'Avenida 4 de Fevereiro, Luanda' })
  @IsString()
  @IsNotEmpty()
  destinoEndereco: string;

  @ApiProperty({ example: -8.8156 })
  @IsNumber()
  destinoLatitude: number;

  @ApiProperty({ example: 13.2302 })
  @IsNumber()
  destinoLongitude: number;

  @ApiPropertyOptional({ example: 'Deixar na portaria' })
  @IsOptional()
  @IsString()
  destinoInstrucoes?: string;

  @ApiProperty({ example: 'Documentos urgentes' })
  @IsString()
  @IsNotEmpty()
  descricaoEncomenda: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  fragil?: boolean;

  @ApiPropertyOptional({ enum: ['carteira', 'dinheiro'], default: 'carteira' })
  @IsOptional()
  @IsEnum(['carteira', 'dinheiro'])
  metodoPagamento?: string;

  @ApiPropertyOptional({ description: 'ID do motoqueiro favorito (opcional)' })
  @IsOptional()
  @IsString()
  motoqueiroPreferdoId?: string;

  @ApiPropertyOptional({ description: 'ID de rota salva para preencher campos automaticamente' })
  @IsOptional()
  @IsString()
  rotaSalvaId?: string;
}
