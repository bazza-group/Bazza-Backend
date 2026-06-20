import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Deliver } from './entities/motoqueiro.entity';
import { Veiculo } from './entities/veiculo.entity';
import { Documento } from './entities/documento.entity';
import { User } from '../users/entities/user.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { MotoqueirosController } from './motoqueiros.controller';
import { MotoqueirosService } from './motoqueiros.service';
import { UsersModule } from '../users/users.module';
import { UploadsModule } from '../uploads/uploads.module';
import { PlanosModule } from '../planos/planos.module';
import { NotificacoesModule } from '../notificacao/notificacao.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deliver, Veiculo, Documento, User, Upload]),
    UsersModule,
    UploadsModule,
    PlanosModule,
    NotificacoesModule,
  ],
  controllers: [MotoqueirosController],
  providers: [MotoqueirosService],
  exports: [MotoqueirosService],
})
export class MotoqueirosModule {}