import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Deliver } from '../motoqueiros/entities/motoqueiro.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { Suporte } from '../suporte/entities/suporte.entity';
import { Transacao } from '../carteira/entities/transacao.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { AdminLog } from './entities/admin-log.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { NotificacoesModule } from '../notificacao/notificacao.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SuporteModule } from '../suporte/suporte.module';
import { SeedModule } from '../seeds/seed.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Deliver, Pedido, Suporte, Transacao, Upload, AdminLog]),
    NotificacoesModule,
    UploadsModule,
    SuporteModule,
    SeedModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
