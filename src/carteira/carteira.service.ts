import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Carteira } from './entities/carteira.entity';
import { Transacao, TipoTransacao } from './entities/transacao.entity';

@Injectable()
export class CarteiraService {
  constructor(
    @InjectRepository(Carteira)
    private carteiraRepository: Repository<Carteira>,
    @InjectRepository(Transacao)
    private transacaoRepository: Repository<Transacao>,
  ) {}

  async getCarteira(userId: string): Promise<Carteira> {
    let carteira = await this.carteiraRepository.findOne({ where: { userId } });

    if (!carteira) {
      carteira = this.carteiraRepository.create({ userId });
      await this.carteiraRepository.save(carteira);
    }

    return carteira;
  }

  async obterHistorico(userId: string) {
    const carteira = await this.getCarteira(userId);
    return this.transacaoRepository.find({
      where: { carteiraId: carteira.id },
      order: { criadoEm: 'DESC' },
    });
  }

  async adicionarTransacao(
    userId: string,
    tipo: TipoTransacao,
    valor: number,
    descricao: string,
    pedidoId?: string,
  ) {
    const carteira = await this.getCarteira(userId);

    const transacao = this.transacaoRepository.create({
      carteiraId: carteira.id,
      tipo,
      valor,
      descricao,
      pedidoId,
    });

    await this.transacaoRepository.save(transacao);

    // Actualiza saldo
    if (tipo === TipoTransacao.CREDITO) {
      carteira.saldo = Number(carteira.saldo) + valor;
      carteira.totalGanho = Number(carteira.totalGanho) + valor;
    } else {
      carteira.saldo = Number(carteira.saldo) - valor;
    }

    return this.carteiraRepository.save(carteira);
  }

  /**
   * Processa pagamento de pedido:
   * - Debita do cliente
   * - Credita no motoqueiro (85% — plataforma fica 15%)
   */
  async processarPagamentoPedido(
    clienteId: string,
    motoqueiroId: string,
    valor: number,
    pedidoId: string,
  ) {
    const taxaPlataforma = valor * 0.15;
    const valorMotoqueiro = valor - taxaPlataforma;

    // Debitar cliente
    await this.adicionarTransacao(
      clienteId,
      TipoTransacao.DEBITO,
      valor,
      `Pagamento pedido #${pedidoId}`,
      pedidoId,
    );

    // Creditar motoqueiro
    await this.adicionarTransacao(
      motoqueiroId,
      TipoTransacao.CREDITO,
      valorMotoqueiro,
      `Ganho pedido #${pedidoId}`,
      pedidoId,
    );

    return { clienteDebitado: valor, motoqueiroCredito: valorMotoqueiro };
  }
}