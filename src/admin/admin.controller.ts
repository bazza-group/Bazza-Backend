import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { SuporteService } from '../suporte/suporte.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SeedService } from '../seeds/seed.service';

@ApiTags('Admin')
@ApiBearerAuth('firebase')
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(
    private readonly service: AdminService,
    private readonly suporteService: SuporteService,
    private readonly seedService: SeedService,
  ) {}

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Estatísticas gerais' })
  dashboard() {
    return this.service.getDashboard();
  }

  // ── SEED ───────────────────────────────────────────────────────────────────
  @Post('seed')
  @ApiOperation({ summary: 'Popular base de dados com utilizadores de teste' })
  seed() {
    return this.seedService.run();
  }

  // ── UTILIZADORES ───────────────────────────────────────────────────────────
  @Get('utilizadores')
  @ApiOperation({ summary: 'Listar utilizadores' })
  listarUtilizadores(@Query('role') role?: string) {
    return this.service.listarUtilizadores(role);
  }

  @Get('utilizadores/:id')
  @ApiOperation({ summary: 'Obter utilizador por ID' })
  obterUtilizador(@Param('id') id: string) {
    return this.service.obterUtilizador(id);
  }

  @Patch('utilizadores/:id/status')
  @ApiOperation({ summary: 'Activar ou suspender utilizador' })
  alterarStatusUtilizador(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.alterarStatusUtilizador(id, status);
  }

  @Patch('utilizadores/:id/suspender')
  @ApiOperation({ summary: 'Suspender utilizador' })
  suspenderUtilizador(@Param('id') id: string) {
    return this.service.suspenderUtilizador(id);
  }

  @Patch('utilizadores/:id/ativar')
  @ApiOperation({ summary: 'Activar utilizador suspenso' })
  ativarUtilizador(@Param('id') id: string) {
    return this.service.ativarUtilizador(id);
  }

  @Delete('utilizadores/:id')
  @ApiOperation({ summary: 'Eliminar utilizador (soft delete)' })
  eliminarUtilizador(@Param('id') id: string) {
    return this.service.eliminarUtilizador(id);
  }

  // ── MOTOQUEIROS ────────────────────────────────────────────────────────────
  @Get('motoqueiros/todos')
  @ApiOperation({ summary: 'Listar todos os motoqueiros' })
  listarTodosMotoqueiros() {
    return this.service.listarTodosMotoqueiros();
  }

  @Get('motoqueiros/pendentes')
  @ApiOperation({ summary: 'Motoqueiros pendentes de aprovação' })
  pendentes() {
    return this.service.listarMotoqueiirosPendentes();
  }

  /** Detalhes completos do motoqueiro (inclui uploads + verificação de documentos) */
  @Get('motoqueiros/:id')
  @ApiOperation({ summary: 'Detalhes de motoqueiro para revisão' })
  detalhes(@Param('id') id: string) {
    return this.service.detalhesMotoqueiro(id);
  }

  /** Aprovar motoqueiro — verifica documentos antes */
  @Patch('motoqueiros/:id/aprovar')
  @ApiOperation({ summary: 'Aprovar motoqueiro' })
  aprovar(@Param('id') id: string) {
    return this.service.aprovarMotoqueiro(id);
  }

  /** Rejeitar motoqueiro com motivo obrigatório */
  @Patch('motoqueiros/:id/rejeitar')
  @ApiOperation({ summary: 'Rejeitar motoqueiro' })
  rejeitar(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.service.rejeitarMotoqueiro(id, motivo);
  }

  /** Suspender motoqueiro */
  @Patch('motoqueiros/:id/suspender')
  @ApiOperation({ summary: 'Suspender motoqueiro' })
  suspenderMotoqueiro(
    @Param('id') id: string,
    @Body('motivo') motivo: string,
  ) {
    return this.service.suspenderMotoqueiro(id, motivo);
  }

  /** Activar motoqueiro suspenso */
  @Patch('motoqueiros/:id/ativar')
  @ApiOperation({ summary: 'Activar motoqueiro suspenso' })
  ativarMotoqueiro(@Param('id') id: string) {
    return this.service.ativarMotoqueiro(id);
  }

  // ── PEDIDOS ────────────────────────────────────────────────────────────────
  @Get('pedidos')
  @ApiOperation({ summary: 'Todos os pedidos' })
  pedidos(@Query('status') status?: string) {
    return this.service.listarPedidos(status);
  }

  @Patch('pedidos/:id')
  @ApiOperation({ summary: 'Actualizar status do pedido' })
  actualizarPedido(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.service.alterarStatusPedido(id, status as any);
  }

  // ── SUPORTE ────────────────────────────────────────────────────────────────
  @Get('suporte')
  @ApiOperation({ summary: 'Todos os tickets de suporte' })
  tickets() {
    return this.suporteService.listarTodosTickets();
  }

  @Patch('suporte/:id/responder')
  @ApiOperation({ summary: 'Responder ticket' })
  async responder(
    @Param('id') id: string,
    @Body('resposta') resposta: string,
    @CurrentUser() user: User,
  ) {
    await this.service.responderTicket(id, resposta, user.id);
    return this.suporteService.alterarStatus(id, 'resolvido');
  }

  @Get('suporte/:id/mensagens')
  @ApiOperation({ summary: 'Listar mensagens de chat de um ticket' })
  async listarMensagens(@Param('id') id: string) {
    await this.suporteService.marcarComoLidas(id, 'admin');
    return this.suporteService.listarMensagens(id);
  }

  @Post('suporte/:id/mensagens')
  @ApiOperation({ summary: 'Admin enviar mensagem num ticket' })
  enviarMensagem(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { texto: string },
  ) {
    return this.suporteService.enviarMensagem(id, user.id, 'admin', body.texto);
  }

  @Patch('suporte/:id/status')
  @ApiOperation({ summary: 'Actualizar status do ticket (resolvido, em_analise, aberto)' })
  alterarStatusSuporte(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.suporteService.alterarStatus(id, body.status);
  }

  @Patch('suporte/:id/fechar')
  @ApiOperation({ summary: 'Fechar conversa de suporte' })
  fecharSuporte(@Param('id') id: string) {
    return this.suporteService.fechar(id);
  }

  @Delete('suporte/todos')
  @ApiOperation({ summary: 'Eliminar todas as conversas de suporte' })
  eliminarTodosSuportes() {
    return this.suporteService.eliminarTodos();
  }

  @Delete('suporte/:id')
  @ApiOperation({ summary: 'Eliminar conversa de suporte individual' })
  eliminarSuporte(@Param('id') id: string) {
    return this.suporteService.eliminar(id);
  }

  // ── DOCUMENTOS ─────────────────────────────────────────────────────────────
  @Get('documentos')
  @ApiOperation({ summary: 'Todos os uploads/documentos' })
  documentos(@Query('skip') skip?: string, @Query('take') take?: string) {
    return this.service.listarUploadsTodos(Number(skip) || 0, Number(take) || 20);
  }

  @Get('documentos/:id/imagem')
  @ApiOperation({ summary: 'Ver imagem do documento' })
  async verImagemDoc(@Param('id') id: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.service.obterImagemDocumento(id);
    res.setHeader('Content-Type', mimeType);
    res.send(buffer);
  }
}
