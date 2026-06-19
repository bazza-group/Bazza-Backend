// src/carteira/carteira.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { CarteiraService } from './carteira.service';
import { FirebaseAuthGuard } from '../auth/guards/firebase-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('carteira')
@UseGuards(FirebaseAuthGuard)
export class CarteiraController {
  constructor(private carteiraService: CarteiraService) {}

  @Get()
  async getCarteira(@CurrentUser() user: any) {
    return this.carteiraService.getCarteira(user.id);
  }

  @Get('historico')
  async getHistorico(@CurrentUser() user: any) {
    return this.carteiraService.obterHistorico(user.id);
  }
}