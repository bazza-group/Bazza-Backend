import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RotaSalva } from './entities/rotas-salvas.entity';
import { MotoqueiroFavorito } from './entities/motoqueiros-favoritos.entity';
import { RotasController } from './rotas.controller';
import { RotasService } from './rotas.service';
import { GoogleMapsModule } from '../google-maps/google-maps.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RotaSalva, MotoqueiroFavorito]),
    GoogleMapsModule,
  ],
  controllers: [RotasController],
  providers: [RotasService],
  exports: [RotasService],
})
export class RotasModule {}