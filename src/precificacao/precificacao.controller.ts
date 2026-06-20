import { Controller, Get, Query } from '@nestjs/common';
import { PrecificacaoService } from './precificacao.service';

@Controller('precificacao')
export class PrecificacaoController {
  constructor(private readonly precificacaoService: PrecificacaoService) {}

  @Get('estimar')
  async estimar(
    @Query('oLat') oLat: number,
    @Query('oLng') oLng: number,
    @Query('dLat') dLat: number,
    @Query('dLng') dLng: number,
  ) {
    return this.precificacaoService.calcularEstimativa(oLat, oLng, dLat, dLng);
  }
}