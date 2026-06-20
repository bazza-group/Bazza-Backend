import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Avaliacao } from './entities/avaliacoe.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { Deliver } from '../motoqueiros/entities/motoqueiro.entity';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Avaliacao, Pedido, Deliver])],
  controllers: [AvaliacoesController],
  providers: [AvaliacoesService],
  exports: [AvaliacoesService],
})
export class AvaliacoesModule {}