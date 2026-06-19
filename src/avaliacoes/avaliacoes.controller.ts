import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AvaliacoesService } from './avaliacoes.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Avaliações')
@ApiBearerAuth('firebase')
@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly service: AvaliacoesService) {}

  @Post('pedidos/:id')
  @ApiOperation({ summary: 'Avaliar motoqueiro após entrega' })
  avaliar(
    @Param('id') pedidoId: string,
    @CurrentUser() user: User,
    @Body() body: { nota: number; comentario?: string },
  ) {
    return this.service.avaliarMotoqueiro(
      pedidoId,
      user.id,
      body.nota,
      body.comentario,
    );
  }

  @Get('utilizador/:id')
  @ApiOperation({ summary: 'Média de classificação de um utilizador' })
  async obterMedia(@Param('id') userId: string) {
    return this.service.obterMediaUtilizador(userId);
  }
}