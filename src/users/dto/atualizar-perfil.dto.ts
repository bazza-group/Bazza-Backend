import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AtualizarPerfilDto {
  @ApiPropertyOptional({ example: 'João' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  nome?: string;

  @ApiPropertyOptional({ example: 'Silva' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sobrenome?: string;

  @ApiPropertyOptional({ example: '1995-03-15' })
  @IsOptional()
  @IsDateString()
  dataNascimento?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fotoPerfil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
