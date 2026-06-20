import {
  Controller, Post, Get, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PedidosService } from './pedidos.service';
import { AvaliacoesService } from '../avaliacoes/avaliacoes.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';

@ApiTags('Pedidos')
@ApiBearerAuth('firebase')
@Controller('pedidos')
export class PedidosController {
  constructor(
    private readonly service: PedidosService,
    private readonly avaliacoesService: AvaliacoesService,
  ) {}

  // ── CLIENTE ──────────────────────────────────────────────────────────────

  /** Criar pedido — chamado pelo cliente no front */
  @Post()
  @ApiOperation({ summary: 'Criar pedido (cliente)' })
  criar(@CurrentUser() user: User, @Body() body: any) {
    return this.service.criar(user.id, body);
  }

  /** Histórico de pedidos (cliente ou motoqueiro) */
  @Get('meus')
  @ApiOperation({ summary: 'Os meus pedidos' })
  meus(@CurrentUser() user: User) {
    if (user.role === 'deliver') {
      return this.service.listarDoMotoqueiro(user.id);
    }
    return this.service.listarDoCliente(user.id);
  }

  /** Ganhos do motoqueiro */
  @Get('ganhos')
  @Roles('deliver')
  @ApiOperation({ summary: 'Ganhos do motoqueiro' })
  ganhos(
    @CurrentUser() user: User,
    @Query('dias') dias?: string,
  ) {
    return this.service.ganhosPorPeriodo(user.id, dias ? parseInt(dias) : 7);
  }

  /** Pedidos disponíveis para o motoqueiro aceitar */
  @Get('disponiveis')
  @Roles('deliver')
  @ApiOperation({ summary: 'Pedidos disponíveis (motoqueiro)' })
  disponiveis() {
    return this.service.listarDisponiveis();
  }

  /** Detalhe de um pedido */
  @Get(':id')
  @ApiOperation({ summary: 'Detalhe de um pedido' })
  detalhe(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  // ── MOTOQUEIRO ───────────────────────────────────────────────────────────

  /** Aceitar pedido */
  @Patch(':id/aceitar')
  @Roles('deliver')
  @ApiOperation({ summary: 'Aceitar pedido (motoqueiro)' })
  aceitar(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { precoAcordado?: number },
  ) {
    return this.service.aceitar(id, user.id, body?.precoAcordado);
  }

  /** Actualizar status (recolhido, entregando, etc.) */
  @Patch(':id/status')
  @Roles('deliver')
  @ApiOperation({ summary: 'Actualizar status do pedido (motoqueiro)' })
  atualizarStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('status') status: string,
  ) {
    return this.service.atualizarStatus(id, status, user.id);
  }

  /**
   * Confirmar entrega com QR code ou código numérico.
   * Body: { metodo: 'qr' | 'codigo', codigoUsado: string }
   */
  @Patch(':id/confirmar-entrega')
  @ApiOperation({ summary: 'Confirmar entrega via QR ou código (cliente ou motoqueiro)' })
  confirmarEntrega(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { metodo: 'qr' | 'codigo'; codigoUsado: string },
  ) {
    return this.service.confirmarEntrega(id, user.id, body.metodo, body.codigoUsado);
  }

  /** Cancelar pedido (cliente ou motoqueiro) */
  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancelar pedido' })
  cancelar(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body('motivo') motivo: string,
  ) {
    return this.service.cancelar(id, user.id, motivo || 'Cancelado pelo utilizador');
  }

  /** Avaliar após entrega — cliente avalia motoqueiro OU motoqueiro avalia cliente */
  @Post(':id/avaliar')
  @ApiOperation({ summary: 'Avaliar após entrega (cliente ou motoqueiro)' })
  avaliar(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { nota: number; comentario?: string },
  ) {
    if (user.role === 'deliver') {
      return this.avaliacoesService.avaliarCliente(
        id, user.id, body.nota, body.comentario,
      );
    }
    return this.avaliacoesService.avaliarMotoqueiro(
      id, user.id, body.nota, body.comentario,
    );
  }
}