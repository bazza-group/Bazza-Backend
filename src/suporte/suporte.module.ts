import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Suporte } from './entities/suporte.entity';
import { MensagemSuporte } from './entities/mensagem-suporte.entity';
import { SuporteController } from './suporte.controller';
import { SuporteService } from './suporte.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [TypeOrmModule.forFeature([Suporte, MensagemSuporte]), ChatModule],
  controllers: [SuporteController],
  providers: [SuporteService],
  exports: [SuporteService],
})
export class SuporteModule {}
