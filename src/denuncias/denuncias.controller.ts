import {
  Controller, Get, Post, Patch, Param, Body, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DenunciasService } from './denuncias.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/guards/roles.guard';
import { User } from '../users/entities/user.entity';
import { TipoDenuncia, StatusDenuncia } from './entities/denuncia.entity';

@ApiTags('Denúncias')
@ApiBearerAuth('firebase')
@Controller('denuncias')
export class DenunciasController {
  constructor(private readonly service: DenunciasService) {}

  /** Criar denúncia (cliente ou motoqueiro) */
  @Post()
  @ApiOperation({ summary: 'Criar denúncia' })
  criar(
    @CurrentUser() user: User,
    @Body() body: {
      pedidoId: string;
      tipo: TipoDenuncia;
      motivos: string[];
      descricao?: string;
    },
  ) {
    return this.service.criar(
      body.pedidoId,
      user.id,
      body.tipo,
      body.motivos,
      body.descricao,
    );
  }

  /** Listar denúncias (admin) */
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar denúncias (admin)' })
  listar(
    @Query('status') status?: string,
    @Query('tipo') tipo?: string,
  ) {
    return this.service.listar({ status, tipo });
  }

  /** Contagem de pendentes (admin) */
  @Get('pendentes/count')
  @Roles('admin')
  @ApiOperation({ summary: 'Contar denúncias pendentes' })
  contarPendentes() {
    return this.service.contarPendentes();
  }

  /** Denúncias de um pedido */
  @Get('pedido/:pedidoId')
  @ApiOperation({ summary: 'Denúncias de um pedido' })
  listarDoPedido(@Param('pedidoId') pedidoId: string) {
    return this.service.listarDoPedido(pedidoId);
  }

  /** Detalhe de denúncia (admin) */
  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Detalhe de denúncia (admin)' })
  obterPorId(@Param('id') id: string) {
    return this.service.obterPorId(id);
  }

  /** Atualizar status da denúncia (admin) */
  @Patch(':id/status')
  @Roles('admin')
  @ApiOperation({ summary: 'Atualizar status da denúncia (admin)' })
  atualizarStatus(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { status: StatusDenuncia; resolucaoNota?: string },
  ) {
    return this.service.atualizarStatus(id, body.status, body.resolucaoNota, user.id);
  }
}
