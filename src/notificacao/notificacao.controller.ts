import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notificacao.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Notificações')
@ApiBearerAuth('firebase')
@Controller('notificacoes')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  minhas(@CurrentUser() user: User) {
    return this.service.listarPorUsuario(user.id);
  }

  @Patch(':id/lida')
  marcarLida(@Param('id') id: string) {
    return this.service.marcarComoLida(id);
  }

  // ── Envio de notificações (admin) ─────────────────────────────────

  @Post('enviar')
  @Roles('admin')
  @ApiOperation({ summary: 'Enviar notificação para utilizador(es) específico(s)' })
  enviarParaUsuario(
    @Body() body: { userIds: string[]; titulo: string; mensagem: string; tipo?: string },
  ) {
    return this.service.enviarParaUsuarios(body.userIds, body.titulo, body.mensagem, body.tipo || 'info');
  }

  @Post('enviar-grupo')
  @Roles('admin')
  @ApiOperation({ summary: 'Enviar notificação para grupo (clientes ou motoqueiros)' })
  enviarParaGrupo(
    @Body() body: { role: string; titulo: string; mensagem: string; tipo?: string },
  ) {
    return this.service.enviarParaGrupo(body.role, body.titulo, body.mensagem, body.tipo || 'info');
  }

  @Post('enviar-todos')
  @Roles('admin')
  @ApiOperation({ summary: 'Enviar notificação para todos os utilizadores' })
  enviarParaTodos(
    @Body() body: { titulo: string; mensagem: string; tipo?: string },
  ) {
    return this.service.enviarParaTodos(body.titulo, body.mensagem, body.tipo || 'info');
  }
}