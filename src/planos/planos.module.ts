import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Plano } from './entities/plano.entity';
import { User } from '../users/entities/user.entity';
import { PlanosController } from './planos.controller';
import { PlanosService } from './planos.service';
import { NotificacoesModule } from '../notificacao/notificacao.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plano, User]),
    MulterModule.register({ storage: memoryStorage() }),
    NotificacoesModule,
    ChatModule,
  ],
  controllers: [PlanosController],
  providers: [PlanosService],
  exports: [PlanosService],
})
export class PlanosModule {}