// ── carteira.module.ts ────────────────────────────────────────
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Carteira } from './entities/carteira.entity';
import { Transacao } from './entities/transacao.entity';
import { CarteiraController } from './carteira.controller';
import { CarteiraService } from './carteira.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([Carteira, Transacao]), UsersModule],
  controllers: [CarteiraController],
  providers: [CarteiraService],
  exports: [CarteiraService],
})
export class CarteiraModule {}