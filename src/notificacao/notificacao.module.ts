import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacao } from './entities/notificacao.entity';
import { NotificationsController } from './notificacao.controller';
import { NotificationsService } from './notificacao.service';
import { UsersModule } from '../users/users.module';
import { FirebaseModule } from '../firebase/firebase.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notificacao]),
    UsersModule,
    FirebaseModule,
    ChatModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificacoesModule {}