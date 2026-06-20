import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MotoqueirosService } from './motoqueiros.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Motoqueiros')
@ApiBearerAuth('firebase')
@Controller('motoqueiros')
export class MotoqueirosController {
  constructor(private readonly service: MotoqueirosService) {}

  /**
   * Completar perfil de motoqueiro (fase 1: dados básicos + veículo)
   */
  @Post('completar-perfil')
  @ApiOperation({
    summary: 'Completar perfil de motoqueiro',
    description:
      'Cria o perfil do motoqueiro com dados básicos e veículo. Documentos são enviados via upload depois.',
  })
  completarPerfil(
    @CurrentUser() user: User,
    @Body() body: {
      nome?: string;
      sobrenome?: string;
      email?: string;
      dataNascimento?: string;
      numeroBI?: string;
      numeroCarta?: string;
      morada?: string;
      marca: string;
      modelo: string;
      placa: string;
      corPrincipal: string;
      ano: number;
    },
  ) {
    return this.service.completarPerfilMotoqueiro(user.id, body);
  }

  /**
   * Ver meu perfil de motoqueiro
   */
  @Get('meu-perfil')
  @ApiOperation({ summary: 'Ver meu perfil de motoqueiro' })
  meuPerfil(@CurrentUser() user: User) {
    return this.service.buscarPorUserId(user.id);
  }

  /**
   * Ver meus documentos (lista de uploads pendentes/aprovados)
   */
  @Get('meus-documentos')
  @ApiOperation({ summary: 'Ver meus documentos' })
  meusDocumentos(@CurrentUser() user: User) {
    return this.service.buscarMeusDocumentos(user.id);
  }

  /**
   * Actualizar status (online/offline/ocupado)
   */
  @Patch('status')
  @ApiOperation({ summary: 'Mudar status (online/offline/ocupado)' })
  atualizarStatus(
    @CurrentUser() user: User,
    @Body('status') status: 'online' | 'offline' | 'ocupado',
  ) {
    return this.service.atualizarStatus(user.id, status);
  }

  /**
   * Actualizar localização GPS
   */
  @Patch('localizacao')
  @ApiOperation({ summary: 'Actualizar localização GPS' })
  atualizarLocalizacao(
    @CurrentUser() user: User,
    @Body() body: { latitude: number; longitude: number },
  ) {
    return this.service.atualizarLocalizacao(
      user.id,
      body.latitude,
      body.longitude,
    );
  }

  // ─────────────────────────────────────────
  // ADMIN ROUTES
  // ─────────────────────────────────────────

  /**
   * Listar motoqueiros pendentes de aprovação (admin)
   */
  @Get('admin/pendentes')
  @Roles('admin')
  @ApiOperation({ summary: 'Listar motoqueiros pendentes (admin)' })
  listarPendentes() {
    return this.service.listarPendentesAprovacao();
  }

  /**
   * Ver detalhes completos de um motoqueiro (admin)
   */
  @Get('admin/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Ver motoqueiro (admin)' })
  verDetalhes(@Param('id') id: string) {
    return this.service.verDetalhesCompletos(id);
  }

  /**
   * Aprovar motoqueiro (admin)
   */
  @Patch('admin/:id/aprovar')
  @Roles('admin')
  @ApiOperation({ summary: 'Aprovar motoqueiro (admin)' })
  aprovar(@Param('id') id: string) {
    return this.service.aprovar(id);
  }

  /**
   * Rejeitar motoqueiro (admin)
   */
  @Patch('admin/:id/rejeitar')
  @Roles('admin')
  @ApiOperation({ summary: 'Rejeitar motoqueiro (admin)' })
  rejeitar(@Param('id') id: string, @Body('motivo') motivo: string) {
    return this.service.rejeitar(id, motivo);
  }
}