import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Preferencia } from './entities/preferencia.entity';
import { PreferenciasService } from './preferencias.service';
import { PreferenciasController } from './preferencias.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Preferencia])],
  controllers: [PreferenciasController],
  providers: [PreferenciasService],
  exports: [PreferenciasService],
})
export class PreferenciasModule {}
