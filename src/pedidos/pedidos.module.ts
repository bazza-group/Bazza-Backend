import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { GoogleMapsModule } from '../google-maps/google-maps.module';
import { NotificacoesModule } from '../notificacao/notificacao.module';
import { MotoqueirosModule } from '../motoqueiros/motoqueiros.module';
import { CarteiraModule } from '../carteira/carteira.module';
import { AvaliacoesModule } from '../avaliacoes/avaliacoes.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Pedido]),
    GoogleMapsModule,
    NotificacoesModule,
    MotoqueirosModule,
    CarteiraModule,
    AvaliacoesModule,
    ChatModule,
  ],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}