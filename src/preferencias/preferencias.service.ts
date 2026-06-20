import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preferencia } from './entities/preferencia.entity';
import { UpdatePreferenciaDto } from './dto/update-preferencia.dto';

@Injectable()
export class PreferenciasService {
  constructor(
    @InjectRepository(Preferencia)
    private readonly repo: Repository<Preferencia>,
  ) {}

  async obterPorUsuario(userId: string): Promise<Preferencia> {
    let pref = await this.repo.findOne({ where: { userId } });
    if (!pref) {
      pref = this.repo.create({ userId });
      await this.repo.save(pref);
    }
    return pref;
  }

  async atualizar(userId: string, dto: UpdatePreferenciaDto): Promise<Preferencia> {
    const pref = await this.obterPorUsuario(userId);
    Object.assign(pref, dto);
    return this.repo.save(pref);
  }
}
