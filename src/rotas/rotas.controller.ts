import {
  Controller, Get, Post, Delete, Param, Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RotasService } from './rotas.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Rotas e Favoritos')
@ApiBearerAuth('firebase')
@Controller('rotas')
export class RotasController {
  constructor(private readonly service: RotasService) {}

  // ── Rotas Salvas ──────────────────────────────────────────────
  @Get()
  @ApiOperation({ summary: 'Listar minhas rotas salvas' })
  listar(@CurrentUser() user: User) {
    return this.service.listar(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Salvar nova rota frequente' })
  salvar(@CurrentUser() user: User, @Body() body: any) {
    return this.service.salvar(user.id, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalhes de uma rota' })
  ver(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.buscarPorId(id, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover rota salva' })
  remover(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remover(id, user.id);
  }

  // ── Motoqueiros Favoritos ─────────────────────────────────────
  @Get('favoritos')
  @ApiOperation({ summary: 'Listar meus motoqueiros favoritos' })
  listarFavoritos(@CurrentUser() user: User) {
    return this.service.listarFavoritos(user.id);
  }

  @Post('favoritos')
  @ApiOperation({ summary: 'Adicionar motoqueiro aos favoritos' })
  adicionarFavorito(
    @CurrentUser() user: User,
    @Body() body: { motoqueiroId: string; alcunha?: string },
  ) {
    return this.service.adicionarFavorito(user.id, body.motoqueiroId, body.alcunha);
  }

  @Delete('favoritos/:id')
  @ApiOperation({ summary: 'Remover dos favoritos' })
  removerFavorito(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.removerFavorito(id, user.id);
  }
}
