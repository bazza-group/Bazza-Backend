import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Avaliacao } from './entities/avaliacoe.entity';
import { Pedido, StatusPedido } from '../pedidos/entities/pedido.entity';
import { Deliver } from '../motoqueiros/entities/motoqueiro.entity';

@Injectable()
export class AvaliacoesService {
  constructor(
    @InjectRepository(Avaliacao) private avaliacaoRepo: Repository<Avaliacao>,
    @InjectRepository(Pedido) private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Deliver) private motoRepo: Repository<Deliver>,
  ) {}

  async avaliarMotoqueiro(
    pedidoId: string,
    clienteId: string,
    nota: number,
    comentario?: string,
  ) {
    const pedido = await this.pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['avaliacoes', 'motoqueiro', 'motoqueiro.user'],
    });

    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.clienteId !== clienteId) {
      throw new BadRequestException('Não és o cliente deste pedido');
    }
    if (pedido.status !== StatusPedido.ENTREGUE) {
      throw new BadRequestException('Só podes avaliar após a entrega');
    }
    if (nota < 1 || nota > 5) {
      throw new BadRequestException('Nota deve ser entre 1 e 5');
    }
    if (!pedido.motoqueiro?.user?.id) {
      throw new BadRequestException('Pedido sem motoqueiro atribuído');
    }

    // Verificar se já avaliou
    const jaAvaliou = pedido.avaliacoes?.some((a) => a.autorId === clienteId);
    if (jaAvaliou) {
      throw new BadRequestException('Já avaliaste este pedido');
    }

    const motoqueiroUserId = pedido.motoqueiro.user.id;

    const avaliacao = this.avaliacaoRepo.create({
      pedidoId,
      autorId: clienteId,
      avaliadoId: motoqueiroUserId,
      rating: nota,
      comentario: comentario || '',
    });

    await this.avaliacaoRepo.save(avaliacao);

    // Recalcular classificação do motoqueiro
    await this.recalcularClassificacao(pedido.motoqueiroId);

    return avaliacao;
  }

  async avaliarCliente(
    pedidoId: string,
    motoqueiroUserId: string,
    nota: number,
    comentario?: string,
  ) {
    const pedido = await this.pedidoRepo.findOne({
      where: { id: pedidoId },
      relations: ['avaliacoes', 'motoqueiro', 'motoqueiro.user', 'cliente'],
    });

    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.status !== StatusPedido.ENTREGUE) {
      throw new BadRequestException('Só podes avaliar após a entrega');
    }
    if (nota < 1 || nota > 5) {
      throw new BadRequestException('Nota deve ser entre 1 e 5');
    }

    // Verificar que é o motoqueiro deste pedido
    const isMotoqueiro = pedido.motoqueiro?.user?.id === motoqueiroUserId;
    if (!isMotoqueiro) {
      throw new BadRequestException('Não és o motoqueiro deste pedido');
    }

    // Verificar se já avaliou
    const jaAvaliou = pedido.avaliacoes?.some((a) => a.autorId === motoqueiroUserId);
    if (jaAvaliou) {
      throw new BadRequestException('Já avaliaste este pedido');
    }

    const avaliacao = this.avaliacaoRepo.create({
      pedidoId,
      autorId: motoqueiroUserId,
      avaliadoId: pedido.clienteId,
      rating: nota,
      comentario: comentario || '',
    });

    await this.avaliacaoRepo.save(avaliacao);
    return avaliacao;
  }

  private async recalcularClassificacao(motoqueiroId: string) {
    const result = await this.avaliacaoRepo
      .createQueryBuilder('a')
      .innerJoin('pedidos', 'p', 'p.id = a.pedidoId')
      .where('p.motoqueiroId = :motoqueiroId', { motoqueiroId })
      .select('AVG(a.rating)', 'media')
      .addSelect('COUNT(a.id)', 'total')
      .getRawOne();

    const media = parseFloat(result?.media || '0');
    const total = parseInt(result?.total || '0', 10);

    await this.motoRepo.update(
      { id: motoqueiroId },
      { classificacaoMedia: media, totalAvaliacoes: total },
    );
  }

  async obterMediaUtilizador(userId: string) {
    const result = await this.avaliacaoRepo
      .createQueryBuilder('a')
      .where('a.avaliadoId = :userId', { userId })
      .select('AVG(a.rating)', 'media')
      .addSelect('COUNT(a.id)', 'total')
      .getRawOne();

    return {
      media: parseFloat(result?.media || '0'),
      total: parseInt(result?.total || '0', 10),
    };
  }
}