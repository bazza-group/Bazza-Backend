import { IsOptional, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenciaDto {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notificacoesPush?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() som?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() idioma?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tema?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() autoAprovacao?: boolean;
}
