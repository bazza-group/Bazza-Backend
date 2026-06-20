import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdicionarVeiculoDto {
  @ApiProperty({ example: 'Honda' })
  @IsString()
  @IsNotEmpty()
  marca: string;

  @ApiProperty({ example: 'CG 125' })
  @IsString()
  @IsNotEmpty()
  modelo: string;
  
  @ApiProperty({ example: 'Vermelho' })
  @IsString()
  @IsNotEmpty()
  cor: string;

  @ApiProperty({ example: 'LD-12-34-AB' })
  @IsString()
  @IsNotEmpty()
  matricula: string;

  @ApiPropertyOptional({ description: 'URL da foto (Firebase Storage)' })
  @IsString()
  @IsNotEmpty()
  fotoUrl?: string;
}
