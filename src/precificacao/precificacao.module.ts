import { Module } from '@nestjs/common';
import { PrecificacaoController } from './precificacao.controller';
import { PrecificacaoService } from './precificacao.service';
import { GoogleMapsModule } from '../google-maps/google-maps.module'; // Importe o módulo

@Module({
  imports: [
    GoogleMapsModule // ESSENCIAL: Adicione aqui para resolver a dependência
  ],
  controllers: [PrecificacaoController],
  providers: [PrecificacaoService],
})
export class PrecificacaoModule {}