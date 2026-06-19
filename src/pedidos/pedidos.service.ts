import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido, StatusPedido, TipoPagamento } from './entities/pedido.entity';
import { GoogleMapsService } from '../google-maps/google-maps.service';
import { NotificationsService } from '../notificacao/notificacao.service';
import { MotoqueirosService } from '../motoqueiros/motoqueiros.service';
import { CarteiraService } from '../carteira/carteira.service';
import { TipoTransacao } from '../carteira/entities/transacao.entity';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private repo: Repository<Pedido>,
    private googleMaps: GoogleMapsService,
    private notifications: NotificationsService,
    private motoqueirosService: MotoqueirosService,
    private carteiraService: CarteiraService,
    private chatGateway: ChatGateway,
  ) {}

  // ── 1. CRIAR PEDIDO ────────────────────────────────────────────────────────
  async criar(clienteId: string, body: any) {
    let distanciaKm = body.distanciaKm || 1;
    let duracaoMinutos = body.duracaoMinutos || 5;

    if (body.origemLatitude && body.destinoLatitude) {
      try {
        const rota = await this.googleMaps.calcularDistancia(
          body.origemLatitude, body.origemLongitude,
          body.destinoLatitude, body.destinoLongitude,
        );
        distanciaKm = rota.distanciaKm;
        duracaoMinutos = rota.duracaoMinutos;
      } catch (e: any) {
        console.warn('Google Maps falhou, usando valores fornecidos:', e.message);
      }
    }

    const valorEntrega = this.googleMaps.calcularPreco(distanciaKm, body.peso);
    const numeroPedido = `BZ-${Date.now()}`;

    // Gerar código de verificação (QR + numérico)
    const codigoNumerico = Math.floor(100000 + Math.random() * 900000).toString();
    const codigoQr = `BIKO:${numeroPedido}:${codigoNumerico}`;

    const dadosPedido = {
      ...body,
      clienteId,
      numeroPedido,
      distanciaKm,
      duracaoMinutos,
      valorEntrega,
      codigoNumerico,
      codigoQr,
      codigoConfirmado: false,
      status: StatusPedido.A_PROCURAR_MOTOQUEIRO,
    };

    const novoPedido = this.repo.create(dadosPedido);
    const pedido = await this.repo.save(novoPedido) as unknown as Pedido;

    // Notificar motoqueiros online
    const motoqueiros = await this.motoqueirosService.listarOnline();
    for (const m of motoqueiros) {
      if (m.user?.id) {
        await this.notifications.notificarNovoPedidoParaMotoqueiro(
          m.user.id,
          pedido.numeroPedido,
          valorEntrega,
          distanciaKm,
          pedido.id,
        );
        // Emitir evento socket para cada motoqueiro online
        try {
          this.chatGateway.server.to(`user_${m.user.id}`).emit('order:new', {
            pedidoId: pedido.id,
            numeroPedido: pedido.numeroPedido,
            valorEntrega,
            distanciaKm,
          });
        } catch {}
      }
    }

    return { ...pedido, valorEntrega, distanciaKm, codigoQr, codigoNumerico };
  }

  // ── 2. ACEITAR PEDIDO (motoqueiro) ─────────────────────────────────────────
  async aceitar(pedidoId: string, motoqueiroUserId: string, precoAcordado?: number) {
    const pedido = await this.repo.findOne({
      where: { id: pedidoId },
      relations: ['cliente'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    if (pedido.status !== StatusPedido.A_PROCURAR_MOTOQUEIRO) {
      throw new BadRequestException('Pedido já não disponível.');
    }

    // Buscar o registro delivers do motoqueiro (FK referencia delivers.id, não users.id)
    const deliver = await this.motoqueirosService.encontrarPorUsuario(motoqueiroUserId);
    if (!deliver) throw new BadRequestException('Perfil de motoqueiro não encontrado.');
    if (deliver.status !== 'activo') {
      throw new ForbiddenException('Ainda não foi aprovado pelo administrador.');
    }

    pedido.motoqueiroId = deliver.id;
    pedido.status = StatusPedido.A_CAMINHO_RECOLHA;
    pedido.atribuidoEm = new Date();
    if (precoAcordado && precoAcordado > 0) {
      pedido.valorEntrega = precoAcordado;
    }
    await this.repo.save(pedido);

    // Buscar deliver com user relation para enviar dados completos
    const deliverCompleto = await this.motoqueirosService.encontrarPorUsuarioComUser(motoqueiroUserId);

    // Emitir evento socket com dados completos do motoqueiro
    try {
      this.chatGateway.server.to(`pedido_${pedido.id}`).emit('order:status_update', {
        pedidoId: pedido.id,
        status: pedido.status,
        motoqueiroId: motoqueiroUserId,
        motoqueiro: deliverCompleto ? {
          id: deliverCompleto.id,
          nome: deliverCompleto.user?.nome || '',
          telefone: deliverCompleto.user?.telefone || '',
          fotoPerfil: deliverCompleto.user?.fotoPerfilUrl || '',
          rating: Number(deliverCompleto.classificacaoMedia) || 0,
          totalAvaliacoes: deliverCompleto.totalAvaliacoes || 0,
        } : undefined,
      });
    } catch {}

    // Notificar cliente
    await this.notifications.notificarPedidoAceite(
      pedido.clienteId,
      pedido.numeroPedido,
    );

    return pedido;
  }

  // ── 3. ACTUALIZAR STATUS (motoqueiro) ──────────────────────────────────────
  async atualizarStatus(
    pedidoId: string,
    novoStatus: string,
    motoqueiroUserId: string,
  ) {
    const pedido = await this.repo.findOne({
      where: { id: pedidoId },
      relations: ['cliente'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');

    const deliver = await this.motoqueirosService.encontrarPorUsuario(motoqueiroUserId);
    if (!deliver || pedido.motoqueiroId !== deliver.id) {
      throw new ForbiddenException('Não és o motoqueiro deste pedido.');
    }

    pedido.status = novoStatus as StatusPedido;

    if (novoStatus === StatusPedido.RECOLHIDO) {
      pedido.recolhidoEm = new Date();
    }

    // "entregue" agora só via confirmarEntrega (QR/código)
    if (novoStatus === StatusPedido.ENTREGUE) {
      pedido.entregueEm = new Date();
    }

    await this.repo.save(pedido);

    // Emitir evento socket
    try {
      this.chatGateway.server.to(`pedido_${pedido.id}`).emit('order:status_update', {
        pedidoId: pedido.id,
        status: pedido.status,
      });
    } catch {}

    // Notificar cliente sobre mudança de status
    await this.notifications.notificarStatusPedido(
      pedido.clienteId,
      pedido.numeroPedido,
      pedido.status,
      pedido.id,
    );

    return pedido;
  }

  // ── 4. CONFIRMAR ENTREGA COM QR OU CÓDIGO ──────────────────────────────────
  async confirmarEntrega(
    pedidoId: string,
    userId: string,
    metodo: 'qr' | 'codigo',
    codigoUsado: string,
  ) {
    const pedido = await this.repo.findOne({
      where: { id: pedidoId },
      relations: ['cliente', 'motoqueiro', 'motoqueiro.user'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');

    // Permitir cliente OU motoqueiro do pedido
    const isCliente = pedido.clienteId === userId;
    let isMotoqueiro = false;
    if (!isCliente) {
      const deliver = await this.motoqueirosService.encontrarPorUsuario(userId);
      isMotoqueiro = !!deliver && pedido.motoqueiroId === deliver.id;
    }
    if (!isCliente && !isMotoqueiro) {
      throw new ForbiddenException('Não pertences a este pedido.');
    }
    if (pedido.codigoConfirmado) {
      return { success: true, message: 'Entrega já confirmada anteriormente.' };
    }

    // Extrair código do QR (formato: "BIKO:BZ-xxx:123456")
    const codigoRecebido =
      metodo === 'qr' ? codigoUsado.split(':')[2] : codigoUsado;

    if (codigoRecebido !== pedido.codigoNumerico) throw new BadRequestException('Código inválido');

    pedido.status = StatusPedido.ENTREGUE;
    pedido.entregueEm = new Date();
    pedido.codigoConfirmado = true;
    pedido.codigoConfirmadoEm = new Date();
    await this.repo.save(pedido);

    // Creditar motoqueiro
    const motoqueiroUserId = pedido.motoqueiro?.user?.id;
    if (motoqueiroUserId) {
      await this._creditarMotoqueiro(pedido, motoqueiroUserId);
    }

    // Emitir evento socket
    try {
      this.chatGateway.server.to(`pedido_${pedido.id}`).emit('order:status_update', {
        pedidoId: pedido.id,
        status: 'entregue',
      });
    } catch {}

    // Notificar cliente
    await this.notifications.notificarPedidoEntregue(
      pedido.clienteId,
      pedido.numeroPedido,
    );

    return {
      success: true,
      message: 'Entrega confirmada com sucesso!',
      pedido,
    };
  }

  // ── 5. CANCELAR ────────────────────────────────────────────────────────────
  async cancelar(pedidoId: string, userId: string, motivo: string) {
    const pedido = await this.repo.findOne({ where: { id: pedidoId }, relations: ['cliente', 'motoqueiro', 'motoqueiro.user'] });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');

    // Verificar permissão: cliente ou motoqueiro dono do pedido
    const isCliente = pedido.clienteId === userId;
    let isMotoqueiro = false;
    if (!isCliente) {
      const deliver = await this.motoqueirosService.encontrarPorUsuario(userId);
      isMotoqueiro = !!deliver && pedido.motoqueiroId === deliver.id;
    }
    if (!isCliente && !isMotoqueiro) {
      throw new ForbiddenException('Sem permissão.');
    }
    pedido.status = StatusPedido.CANCELADO;
    pedido.motivoCancelamento = motivo;
    pedido.canceladoEm = new Date();
    await this.repo.save(pedido);

    // Emitir evento socket
    try {
      this.chatGateway.server.to(`pedido_${pedido.id}`).emit('order:status_update', {
        pedidoId: pedido.id,
        status: 'cancelado',
      });
    } catch {}

    // Notificar a outra parte
    const notificarUserId = isCliente
      ? (await this.repo.findOne({ where: { id: pedidoId }, relations: ['motoqueiro', 'motoqueiro.user'] }))?.motoqueiro?.user?.id
      : pedido.clienteId;
    if (notificarUserId) {
      await this.notifications.criar(
        notificarUserId,
        'pedido_cancelado',
        '❌ Pedido cancelado',
        `O pedido ${pedido.numeroPedido} foi cancelado. Motivo: ${motivo}`,
        { tipo: 'pedido_cancelado', numeroPedido: pedido.numeroPedido, pedidoId: pedido.id },
      );
    }

    return pedido;
  }

  // ── 6. LISTAGENS ───────────────────────────────────────────────────────────
  async listarDoCliente(clienteId: string) {
    return this.repo.find({
      where: { clienteId },
      order: { criadoEm: 'DESC' },
      relations: ['motoqueiro', 'motoqueiro.user'],
    });
  }

  async listarDoMotoqueiro(userId: string) {
    const deliver = await this.motoqueirosService.encontrarPorUsuario(userId);
    if (!deliver) return [];
    return this.repo.find({
      where: { motoqueiroId: deliver.id },
      order: { criadoEm: 'DESC' },
      relations: ['cliente'],
    });
  }

  async listarDisponiveis() {
    const umDiaAtras = new Date();
    umDiaAtras.setDate(umDiaAtras.getDate() - 1);

    return this.repo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.cliente', 'cliente')
      .where('p.status = :status', { status: StatusPedido.A_PROCURAR_MOTOQUEIRO })
      .andWhere('p.criadoEm >= :umDiaAtras', { umDiaAtras })
      .orderBy('p.criadoEm', 'DESC')
      .getMany();
  }

  async buscarPorId(id: string) {
    const pedido = await this.repo.findOne({
      where: { id },
      relations: ['cliente', 'motoqueiro', 'motoqueiro.user'],
    });
    if (!pedido) throw new NotFoundException('Pedido não encontrado.');
    return pedido;
  }

  // ── 7. GANHOS DO MOTOQUEIRO ────────────────────────────────────────────────
  async ganhosPorPeriodo(userId: string, dias = 7) {
    const deliver = await this.motoqueirosService.encontrarPorUsuario(userId);
    if (!deliver) return { total: 0, totalPedidos: 0, dias: [], porDia: {}, pedidos: [] };

    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    const pedidos = await this.repo
      .createQueryBuilder('p')
      .where('p.motoqueiroId = :motoqueiroId', { motoqueiroId: deliver.id })
      .andWhere('p.status = :status', { status: StatusPedido.ENTREGUE })
      .andWhere('p.entregueEm >= :desde', { desde })
      .orderBy('p.entregueEm', 'DESC')
      .getMany();

    const total = pedidos.reduce((s, p) => s + Number(p.valorEntrega) * 0.85, 0);
    const porDia: Record<string, number> = {};

    // Montar array de dias no formato esperado pelo mobile
    const diasArray: Array<{ date: string; total: number; count: number; hourlyData: number[] }> = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (dias - 1 - i));
      const key = d.toISOString().split('T')[0];

      const dayPedidos = pedidos.filter(
        p => new Date(p.entregueEm).toISOString().split('T')[0] === key,
      );

      const hourlyData = Array(24).fill(0);
      let dayTotal = 0;
      dayPedidos.forEach(p => {
        const ganho = Number(p.valorEntrega) * 0.85;
        const h = new Date(p.entregueEm).getHours();
        hourlyData[h] += ganho;
        dayTotal += ganho;
      });

      porDia[key] = dayTotal;
      diasArray.push({
        date: key,
        total: dayTotal,
        count: dayPedidos.length,
        hourlyData,
      });
    }

    return { total, totalPedidos: pedidos.length, dias: diasArray, porDia, pedidos };
  }

  // ── HELPER PRIVADO ─────────────────────────────────────────────────────────
  private async _creditarMotoqueiro(pedido: Pedido, motoqueiroUserId: string) {
    const ganho = Number(pedido.valorEntrega) * 0.85;
    await this.carteiraService.adicionarTransacao(
      motoqueiroUserId,
      TipoTransacao.CREDITO,
      ganho,
      `Entrega ${pedido.numeroPedido}`,
      pedido.id,
    );
  }
}