import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Deliver, DeliverStatus } from '../motoqueiros/entities/motoqueiro.entity';
import { Pedido, StatusPedido } from '../pedidos/entities/pedido.entity';
import { Suporte } from '../suporte/entities/suporte.entity';
import { Transacao } from '../carteira/entities/transacao.entity';
import { NotificationsService } from '../notificacao/notificacao.service';
import { UploadsService } from '../uploads/uploads.service';
import { Upload } from '../uploads/entities/upload.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)      private userRepo: Repository<User>,
    @InjectRepository(Deliver)   private motoRepo: Repository<Deliver>,
    @InjectRepository(Pedido)    private pedidoRepo: Repository<Pedido>,
    @InjectRepository(Suporte)   private suporteRepo: Repository<Suporte>,
    @InjectRepository(Transacao) private transacaoRepo: Repository<Transacao>,
    @InjectRepository(Upload)    private uploadRepo: Repository<Upload>,
    private uploads: UploadsService,
    private notifications: NotificationsService,
  ) {}

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  async getDashboard() {
    const [
      totalUtilizadores, totalMotoqueiros, totalPedidos,
      pedidosEntregues, ticketsAbertos, motoqueiroPendentes,
    ] = await Promise.all([
      this.userRepo.count({ where: { status: UserStatus.ACTIVE } }),
      this.motoRepo.count(),
      this.pedidoRepo.count(),
      this.pedidoRepo.count({ where: { status: StatusPedido.ENTREGUE } }),
      this.suporteRepo.count({ where: { status: 'aberto' } }),
      this.motoRepo.count({ where: { status: DeliverStatus.PENDENTE } }),
    ]);

    return {
      totalUtilizadores, totalMotoqueiros, totalPedidos,
      pedidosEntregues, ticketsAbertos, motoqueiroPendentes,
    };
  }

  // ── UTILIZADORES ───────────────────────────────────────────────────────────
  async listarUtilizadores(role?: string) {
    const qb = this.userRepo.createQueryBuilder('u')
      .where('u.status != :eliminado', { eliminado: UserStatus.ELIMINADO })
      .orderBy('u.criadoEm', 'DESC');
    if (role) qb.andWhere('u.role = :role', { role });
    return qb.getMany();
  }

  async obterUtilizador(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    return user;
  }

  async alterarStatusUtilizador(id: string, status: string) {
    const s = status === 'active' ? UserStatus.ACTIVE : UserStatus.SUSPENDED;
    await this.userRepo.update(id, { status: s });
    return { message: `Utilizador ${status === 'active' ? 'activado' : 'suspenso'}` };
  }

  async suspenderUtilizador(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    if (user.status === UserStatus.ELIMINADO) {
      throw new BadRequestException('Não é possível suspender um utilizador eliminado');
    }
    await this.userRepo.update(id, { status: UserStatus.SUSPENDED });
    return { message: 'Utilizador suspenso com sucesso' };
  }

  async ativarUtilizador(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    if (user.status === UserStatus.ELIMINADO) {
      throw new BadRequestException('Não é possível activar um utilizador eliminado');
    }
    await this.userRepo.update(id, { status: UserStatus.ACTIVE });
    return { message: 'Utilizador activado com sucesso' };
  }

  async eliminarUtilizador(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilizador não encontrado');
    if (user.status === UserStatus.ELIMINADO) {
      throw new BadRequestException('Utilizador já foi eliminado');
    }

    // Soft delete: marcar como eliminado, preservar dados
    await this.userRepo.update(id, {
      status: UserStatus.ELIMINADO,
      fcmToken: null as any,
    });

    return { message: 'Conta eliminada com sucesso' };
  }

  // ── MOTOQUEIROS ────────────────────────────────────────────────────────────
  async listarMotoqueiirosPendentes() {
    return this.motoRepo.find({
      where: { status: DeliverStatus.PENDENTE },
      relations: ['user', 'veiculos'],
      order: { criadoEm: 'ASC' },
    });
  }

  /**
   * Aprovar motoqueiro.
   * Verifica se tem todos os documentos obrigatórios (existência, não status).
   * O motoqueiro é aprovado como um todo — não existe aprovação por documento individual.
   */
  async aprovarMotoqueiro(id: string) {
    const motoqueiro = await this.motoRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');
    if (motoqueiro.status === DeliverStatus.ACTIVO) {
      return { message: 'Motoqueiro já está activo' };
    }

    // Verificar se tem todos os documentos obrigatórios
    const temTodosDocumentos = await this.uploads.temTodosDocumentosObrigatorios(motoqueiro.userId);

    if (!temTodosDocumentos) {
      throw new BadRequestException(
        'Motoqueiro não tem todos os documentos obrigatórios.',
      );
    }

    await this.motoRepo.update(id, {
      status: DeliverStatus.ACTIVO,
      aprovadoEm: new Date(),
      motivoRejeicao: null as any,
    });

    // Activar o user também
    await this.userRepo.update(motoqueiro.userId, { status: UserStatus.ACTIVE });

    await this.notifications.criar(
      motoqueiro.userId,
      'conta_aprovada',
      '🎉 Conta aprovada!',
      'A tua conta de motoqueiro foi aprovada. Já podes começar a receber pedidos!',
      { tipo: 'conta_aprovada' },
    );

    return { message: 'Motoqueiro aprovado com sucesso' };
  }

  /**
   * Rejeitar motoqueiro com motivo.
   * Suspende o motoqueiro e o user associado.
   */
  async rejeitarMotoqueiro(id: string, motivo: string) {
    if (!motivo?.trim()) throw new BadRequestException('Motivo de rejeição é obrigatório');

    const motoqueiro = await this.motoRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    await this.motoRepo.update(id, {
      status: DeliverStatus.SUSPENSO,
      motivoRejeicao: motivo,
    });

    await this.userRepo.update(motoqueiro.userId, {
      status: UserStatus.SUSPENDED,
    });

    await this.notifications.criar(
      motoqueiro.userId,
      'conta_rejeitada',
      '❌ Registo não aprovado',
      `A tua candidatura foi rejeitada. Motivo: ${motivo}`,
      { tipo: 'conta_rejeitada', motivo },
    );

    return { message: 'Motoqueiro rejeitado' };
  }

  /** Listar todos os motoqueiros com user e veículos (exclui eliminados) */
  async listarTodosMotoqueiros() {
    return this.motoRepo.createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .leftJoinAndSelect('m.veiculos', 'v')
      .where('u.status != :eliminado OR u.status IS NULL', { eliminado: UserStatus.ELIMINADO })
      .orderBy('m.criadoEm', 'DESC')
      .getMany();
  }

  /** Suspender motoqueiro */
  async suspenderMotoqueiro(id: string, motivo: string) {
    const motoqueiro = await this.motoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    await this.motoRepo.update(id, {
      status: DeliverStatus.SUSPENSO,
      motivoRejeicao: motivo || 'Suspenso pelo administrador',
    });
    // Suspender o user também
    await this.userRepo.update(motoqueiro.userId, { status: UserStatus.SUSPENDED });

    return { message: 'Motoqueiro suspenso' };
  }

  async ativarMotoqueiro(id: string) {
    const motoqueiro = await this.motoRepo.findOne({ where: { id }, relations: ['user'] });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    await this.motoRepo.update(id, {
      status: DeliverStatus.ACTIVO,
      motivoRejeicao: null as any,
    });
    // Activar o user também
    await this.userRepo.update(motoqueiro.userId, { status: UserStatus.ACTIVE });

    return { message: 'Motoqueiro activado' };
  }

  // ── PEDIDOS ────────────────────────────────────────────────────────────────
  async listarPedidos(status?: string) {
    const where: any = {};
    if (status) where.status = status as StatusPedido;
    return this.pedidoRepo.find({
      where,
      order: { criadoEm: 'DESC' },
      relations: ['cliente', 'motoqueiro', 'motoqueiro.user'],
    });
  }

  async alterarStatusPedido(id: string, status: StatusPedido) {
    const pedido = await this.pedidoRepo.findOne({ where: { id } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');

    const updateData: any = { status };

    if (status === StatusPedido.CANCELADO) {
      updateData.canceladoEm = new Date();
      if (!pedido.motivoCancelamento) {
        updateData.motivoCancelamento = 'Cancelado pelo administrador';
      }
    } else if (status === StatusPedido.ENTREGUE) {
      updateData.entregueEm = new Date();
    }

    await this.pedidoRepo.update(id, updateData);
    return { message: 'Status do pedido actualizado' };
  }

  // ── SUPORTE ────────────────────────────────────────────────────────────────
  async listarTickets() {
    return this.suporteRepo.find({
      where: { status: 'aberto' },
      order: { criadoEm: 'ASC' },
      relations: ['user'],
    });
  }

  async responderTicket(id: string, resposta: string, adminId: string) {
    await this.suporteRepo.update(id, {
      resposta,
      respondidoPor: adminId,
      status: 'resolvido',
      resolvidoEm: new Date(),
    });
    return { message: 'Ticket respondido' };
  }

  // ── DOCUMENTOS / UPLOADS ───────────────────────────────────────────────────
  async listarUploadsTodos(skip = 0, take = 20) {
    return this.uploads.listarTodos(skip, take);
  }

  async obterImagemDocumento(uploadId: string): Promise<{ buffer: Buffer; mimeType: string }> {
    return this.uploads.obterFicheiro(uploadId);
  }

  /**
   * Ver detalhes completos de um motoqueiro para o admin:
   * dados pessoais + veículos + uploads + verificação de documentos
   */
  async detalhesMotoqueiro(motoqueiroId: string) {
    const motoqueiro = await this.motoRepo.findOne({
      where: { id: motoqueiroId },
      relations: ['user', 'veiculos'],
    });
    if (!motoqueiro) throw new NotFoundException('Motoqueiro não encontrado');

    const uploads = await this.uploadRepo
      .createQueryBuilder('u')
      .where('u.userId = :userId', { userId: motoqueiro.userId })
      .orderBy('u.criadoEm', 'DESC')
      .getMany();

    const tiposObrigatorios = [
      'foto_perfil', 'documento_bi_frente', 'documento_bi_verso',
      'documento_carta_frente', 'documento_carta_verso', 'foto_veiculo', 'foto_placa',
    ];
    const tiposEnviados = uploads.map(u => u.tipo);
    const tiposEmFalta = tiposObrigatorios.filter(t => !tiposEnviados.includes(t as any));
    const temTodosDocumentos = tiposEmFalta.length === 0;

    return {
      motoqueiro,
      uploads,
      temTodosDocumentos,
      tiposEmFalta,
      mensagem: temTodosDocumentos
        ? 'Todos os documentos estão presentes. Pode aprovar o motoqueiro.'
        : `Faltam ${tiposEmFalta.length} documentos para poder aprovar o motoqueiro.`,
    };
  }
}
