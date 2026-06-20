import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Denuncia } from './entities/denuncia.entity';
import { DenunciasService } from './denuncias.service';
import { DenunciasController } from './denuncias.controller';
import { NotificacoesModule } from '../notificacao/notificacao.module';
import { ChatModule } from '../chat/chat.module';
import { UsersModule } from '../users/users.module';
import { PedidosModule } from '../pedidos/pedidos.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Denuncia]),
    NotificacoesModule,
    ChatModule,
    UsersModule,
    PedidosModule,
  ],
  controllers: [DenunciasController],
  providers: [DenunciasService],
  exports: [DenunciasService],
})
export class DenunciasModule {}
