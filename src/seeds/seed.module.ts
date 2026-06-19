import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Deliver } from '../motoqueiros/entities/motoqueiro.entity';
import { Veiculo } from '../motoqueiros/entities/veiculo.entity';
import { Pedido } from '../pedidos/entities/pedido.entity';
import { Plano } from '../planos/entities/plano.entity';
import { Upload } from '../uploads/entities/upload.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Deliver, Veiculo, Pedido, Plano, Upload])],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}
