import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Denuncia, TipoDenuncia, StatusDenuncia } from './entities/denuncia.entity';
import { NotificationsService } from '../notificacao/notificacao.service';
import { ChatGateway } from '../chat/chat.gateway';
import { UsersService } from '../users/users.service';
import { PedidosService } from '../pedidos/pedidos.service';

@Injectable()
export class DenunciasService {
  constructor(
    @InjectRepository(Denuncia) private repo: Repository<Denuncia>,
    private notifications: NotificationsService,
    private chatGateway: ChatGateway,
    private usersService: UsersService,
    private pedidosService: PedidosService,
  ) {}

  async criar(
    pedidoId: string,
    autorId: string,
    tipo: TipoDenuncia,
    motivos: string[],
    descricao?: string,
  ) {
    // Buscar pedido para obter IDs
    const pedido = await this.pedidosService.buscarPorId(pedidoId);

    const isCliente = pedido.clienteId === autorId;
    const denunciadoId = isCliente
      ? (pedido as any).motoqueiro?.user?.id || pedido.motoqueiroId
      : pedido.clienteId;

    if (!denunciadoId) {
      throw new BadRequestException('Não foi possível identificar a parte denunciada.');
    }

    const denuncia = this.repo.create({
      pedidoId,
      autorId,
      denunciadoId,
      tipo,
      motivos: motivos || [],
      descricao: descricao || undefined,
      status: StatusDenuncia.PENDENTE,
    });

    await this.repo.save(denuncia);

    // Notificar admins via socket
    try {
      this.chatGateway.server.to('role_admin').emit('denuncia:new', {
        id: denuncia.id,
        pedidoId,
        tipo,
        motivos,
        criadoEm: denuncia.criadoEm,
      });
    } catch {}

    return denuncia;
  }

  async listar(filtros?: { status?: string; tipo?: string }) {
    const qb = this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.pedido', 'pedido')
      .leftJoinAndSelect('d.autor', 'autor')
      .leftJoinAndSelect('d.denunciado', 'denunciado')
      .orderBy('d.criadoEm', 'DESC');

    if (filtros?.status) {
      qb.andWhere('d.status = :status', { status: filtros.status });
    }
    if (filtros?.tipo) {
      qb.andWhere('d.tipo = :tipo', { tipo: filtros.tipo });
    }

    return qb.getMany();
  }

  async obterPorId(id: string) {
    const denuncia = await this.repo.findOne({
      where: { id },
      relations: ['pedido', 'autor', 'denunciado'],
    });
    if (!denuncia) throw new NotFoundException('Denúncia não encontrada.');
    return denuncia;
  }

  async atualizarStatus(
    id: string,
    novoStatus: StatusDenuncia,
    resolucaoNota?: string,
    adminUserId?: string,
  ) {
    const denuncia = await this.obterPorId(id);

    denuncia.status = novoStatus;
    if (resolucaoNota) denuncia.resolucaoNota = resolucaoNota;
    if (novoStatus === StatusDenuncia.RESOLVIDA || novoStatus === StatusDenuncia.ARQUIVADA) {
      if (adminUserId) denuncia.resolvidoPor = adminUserId;
      denuncia.resolvidoEm = new Date();
    }

    await this.repo.save(denuncia);

    // Notificar o autor da denúncia
    try {
      const statusLabel = novoStatus === StatusDenuncia.RESOLVIDA ? 'resolvida' :
        novoStatus === StatusDenuncia.ARQUIVADA ? 'arquivada' :
        novoStatus === StatusDenuncia.EM_ANALISE ? 'em análise' : 'pendente';
      await this.notifications.criar(
        denuncia.autorId,
        'denuncia',
        '📋 Denúncia atualizada',
        `A tua denúncia foi marcada como "${statusLabel}"${resolucaoNota ? `: ${resolucaoNota}` : '.'}`,
        { tipo: 'denuncia', denunciaId: denuncia.id, novoStatus },
      );
    } catch {}

    return denuncia;
  }

  async listarDoPedido(pedidoId: string) {
    return this.repo.find({
      where: { pedidoId },
      relations: ['autor', 'denunciado'],
      order: { criadoEm: 'DESC' },
    });
  }

  async contarPendentes() {
    return this.repo.count({
      where: { status: StatusDenuncia.PENDENTE },
    });
  }
}
