import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RotaSalva } from './entities/rotas-salvas.entity';
import { MotoqueiroFavorito } from './entities/motoqueiros-favoritos.entity';
import { GoogleMapsService } from '../google-maps/google-maps.service';
import { PricingService } from '../google-maps/pricing.service';

@Injectable()
export class RotasService {
  constructor(
    @InjectRepository(RotaSalva)
    private rotaRepo: Repository<RotaSalva>,
    
    @InjectRepository(MotoqueiroFavorito)
    private favoritoRepo: Repository<MotoqueiroFavorito>,
    
    private googleMaps: GoogleMapsService,
    private pricing: PricingService,
  ) {}

  async salvar(userId: string, dados: any) {
    const { distanciaKm } = await this.googleMaps.calcularDistancia(
      dados.origemLatitude, dados.origemLongitude,
      dados.destinoLatitude, dados.destinoLongitude,
    );

    const rota = this.rotaRepo.create({
      ...dados,
      userId,
      distanciaKm,
      vezesUsada: 0
    });

    return this.rotaRepo.save(rota);
  }

  async listar(userId: string) {
    return this.rotaRepo.find({
      where: { userId },
      order: { vezesUsada: 'DESC' },
    });
  }


  async buscarPorId(id: string, userId: string) {
    const rota = await this.rotaRepo.findOne({
      where: { id, userId },
    });
    if (!rota) throw new NotFoundException('Rota não encontrada.');
    return rota;
  }

  async incrementarUso(id: string) {
    await this.rotaRepo.increment({ id }, 'vezesUsada', 1);
  }

  async remover(id: string, userId: string) {
    const rota = await this.buscarPorId(id, userId);
    await this.rotaRepo.remove(rota);
    return { message: 'Rota removida' };
  }

  // ── Motoqueiros Favoritos ─────────────────────────────────────
  async adicionarFavorito(clienteId: string, motoqueiroId: string, alcunha?: string) {
    const existe = await this.favoritoRepo.findOne({
      where: { clienteId, motoqueiroId },
    });

    if (existe) {
      // Actualiza o apelido se já existir
      existe.alcunha = alcunha || existe.alcunha;
      return this.favoritoRepo.save(existe);
    }

    const favorito = this.favoritoRepo.create({
      clienteId,
      motoqueiroId,
      alcunha,
    });

    return this.favoritoRepo.save(favorito);
  }

  async listarFavoritos(clienteId: string) {
    return this.favoritoRepo.find({
      where: { clienteId },
      relations: ['motoqueiro', 'motoqueiro.user', 'motoqueiro.veiculos'],
      order: { totalEntregasJuntos: 'DESC' },
    });
  }

  async removerFavorito(id: string, clienteId: string) {
    const favorito = await this.favoritoRepo.findOne({
      where: { id, clienteId },
    });
    if (!favorito) throw new NotFoundException('Favorito não encontrado.');
    await this.favoritoRepo.remove(favorito);
    return { message: 'Removido dos favoritos' };
  }

  async incrementarEntregasJuntos(clienteId: string, motoqueiroId: string) {
    const favorito = await this.favoritoRepo.findOne({
      where: { clienteId, motoqueiroId },
    });
    if (favorito) {
      await this.favoritoRepo.increment(
        { id: favorito.id },
        'totalEntregasJuntos',
        1,
      );
    }
  }
}


