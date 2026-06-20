import { Controller, Get, Post, Param, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SuporteService } from './suporte.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Suporte')
@ApiBearerAuth('firebase')
@Controller('suporte')
export class SuporteController {
  constructor(private readonly service: SuporteService) {}

  @Post()
  @ApiOperation({ summary: 'Abrir ticket de suporte' })
  criar(
    @CurrentUser() user: User,
    @Body() body: { assunto: string; mensagem: string },
  ) {
    return this.service.criar(user.id, body.assunto, body.mensagem);
  }

  @Get('meus')
  @ApiOperation({ summary: 'Ver meus tickets de suporte' })
  meus(@CurrentUser() user: User) {
    return this.service.listarDoUtilizador(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalhes de um ticket' })
  ver(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  // ─── CHAT DE SUPORTE ───────────────────────────────────────
  @Get(':id/mensagens')
  @ApiOperation({ summary: 'Listar mensagens de um ticket' })
  async listarMensagens(@Param('id') id: string, @CurrentUser() user: User) {
    await this.service.marcarComoLidas(id, 'cliente');
    return this.service.listarMensagens(id);
  }

  @Post(':id/mensagens')
  @ApiOperation({ summary: 'Enviar mensagem num ticket' })
  enviarMensagem(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { texto: string },
  ) {
    return this.service.enviarMensagem(id, user.id, 'cliente', body.texto);
  }

  @Patch(':id/mensagens/lidas')
  @ApiOperation({ summary: 'Marcar mensagens como lidas' })
  marcarLidas(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.marcarComoLidas(id, 'cliente');
  }
}
