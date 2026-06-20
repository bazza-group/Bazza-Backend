import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Plano, StatusPlano, TipoPlano } from './entities/plano.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notificacao/notificacao.service';
import { ChatGateway } from '../chat/chat.gateway';

const PRECOS: Record<TipoPlano, { valor: number; dias: number }> = {
  [TipoPlano.GRATUITO]: { valor: 0, dias: 7 },
  [TipoPlano.DIARIO]:   { valor: 1000, dias: 1 },
  [TipoPlano.SEMANAL]:  { valor: 5000, dias: 7 },
  [TipoPlano.MENSAL]:   { valor: 15000, dias: 30 },
};

@Injectable()
export class PlanosService {
  private logger = new Logger(PlanosService.name);

  constructor(
    @InjectRepository(Plano) private planoRepo: Repository<Plano>,
    @InjectRepository(User)  private userRepo:  Repository<User>,
    private notifications: NotificationsService,
    private chatGateway: ChatGateway,
  ) {}

  // ── Plano Gratuito (trial de 7 dias) ────────────────────────────────
  async atribuirPlanoGratuito(userId: string) {
    const existente = await this.planoRepo.findOne({
      where: { userId, tipo: TipoPlano.GRATUITO },
    });

    const agora = new Date();

    if (existente) {
      // Se o plano ainda está ativo e não expirou, devolver como está
      if (existente.status === StatusPlano.ATIVO && existente.expiraEm && existente.expiraEm > agora) {
        return existente;
      }
      // Se expirou ou foi marcado como expirado — reativar com novas datas
      existente.status = StatusPlano.ATIVO;
      existente.ativoEm = agora;
      existente.expiraEm = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
      await this.planoRepo.save(existente);

      await this.userRepo.update(userId, {
        planoAtivo: TipoPlano.GRATUITO,
        planoExpiraEm: existente.expiraEm,
      } as any);

      await this.notifications.criar(
        userId,
        'plano',
        'Plano Gratuito Reativado!',
        `Tens 7 dias de trial gratuito! O teu plano expira em ${existente.expiraEm.toLocaleDateString('pt-AO')}.`,
        { tipo: 'plano', accao: 'trial_atribuido' },
      );

      this.logger.log(`Plano gratuito reativado para ${userId}, expira em ${existente.expiraEm.toISOString()}`);
      return existente;
    }

    const expiraEm = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);

    const plano = this.planoRepo.create({
      userId,
      tipo: TipoPlano.GRATUITO,
      valor: 0,
      status: StatusPlano.ATIVO,
      ativoEm: agora,
      expiraEm,
    });
    await this.planoRepo.save(plano);

    await this.userRepo.update(userId, {
      planoAtivo: TipoPlano.GRATUITO,
      planoExpiraEm: expiraEm,
    } as any);

    await this.notifications.criar(
      userId,
      'plano',
      'Bem-vindo à Baza!',
      `Tens 7 dias de trial gratuito! O teu plano expira em ${expiraEm.toLocaleDateString('pt-AO')}.`,
      { tipo: 'plano', accao: 'trial_atribuido' },
    );

    this.logger.log(`Plano gratuito atribuído a ${userId}, expira em ${expiraEm.toISOString()}`);
    return plano;
  }

  // ── Tarefa agendada: expirar planos FREE diariamente ──────────────
  @Cron('0 2 * * *')
  async expirarPlanosGratuitos() {
    const agora = new Date();
    const expirados = await this.planoRepo.find({
      where: {
        tipo: TipoPlano.GRATUITO,
        status: StatusPlano.ATIVO,
        expiraEm: LessThanOrEqual(agora),
      },
      relations: ['user'],
    });

    for (const plano of expirados) {
      plano.status = StatusPlano.EXPIRADO;
      await this.planoRepo.save(plano);

      await this.userRepo.update(plano.userId, {
        planoAtivo: null,
        planoExpiraEm: null,
      } as any);

      await this.notifications.criar(
        plano.userId,
        'plano',
        'Plano Gratuito Expirado',
        'O teu plano gratuito expirou. Adquire um plano pago para continuares a receber entregas.',
        { tipo: 'plano', accao: 'trial_expirado' },
      );
      this.logger.log(`Plano gratuito expirado: ${plano.id} (user: ${plano.userId})`);
    }

    if (expirados.length > 0) {
      this.logger.log(`${expirados.length} plano(s) gratuito(s) expirado(s)`);
    }
  }

  // ── Aviso D-1 antes do fim do plano gratuito ─────────────────────
  @Cron('0 10 * * *')
  async avisarExpiracaoProxima() {
    const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const planos = await this.planoRepo.find({
      where: {
        tipo: TipoPlano.GRATUITO,
        status: StatusPlano.ATIVO,
        expiraEm: LessThanOrEqual(amanha),
      },
      relations: ['user'],
    });

    for (const plano of planos) {
      if (plano.expiraEm && plano.expiraEm > new Date()) {
        await this.notifications.criar(
          plano.userId,
          'plano',
          'Plano Gratuito a Expirar',
          'O teu plano gratuito expira amanhã. Renova para continuar a receber entregas.',
          { tipo: 'plano', accao: 'trial_expiracao_proxima' },
        );
        this.logger.log(`Aviso D-1 enviado para ${plano.userId}`);
      }
    }
  }

  // Verificar se motoqueiro pode aceitar entregas
  async podeAceitarEntregas(userId: string): Promise<boolean> {
    const plano = await this.planoRepo.findOne({
      where: { userId, status: StatusPlano.ATIVO },
      order: { expiraEm: 'DESC' },
    });
    if (!plano) return false;
    if (plano.expiraEm && plano.expiraEm < new Date()) return false;
    return true;
  }

  // ── Submeter comprovativo de plano pago ─────────────────────────────
  async submeterComprovativo(userId: string, tipo: TipoPlano, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Comprovativo obrigatório');
    if (tipo === TipoPlano.GRATUITO) throw new BadRequestException('Plano gratuito é atribuído automaticamente');
    const config = PRECOS[tipo];
    if (!config) throw new BadRequestException('Tipo de plano inválido');

    const plano = this.planoRepo.create({
      userId,
      tipo,
      valor: config.valor,
      comprovativo: file.buffer,
      comprovativoMime: file.mimetype,
      status: StatusPlano.PENDENTE,
    });
    await this.planoRepo.save(plano);

    // Notificar admin em tempo real
    this.chatGateway.server.to('role_admin').emit('plano:new', {
      planoId: plano.id,
      userId,
      tipo,
      valor: config.valor,
    });

    return { message: 'Comprovativo enviado! Aguarde a aprovação do administrador.', planoId: plano.id };
  }

  async aprovar(planoId: string) {
    const plano = await this.planoRepo.findOne({ where: { id: planoId }, relations: ['user'] });
    if (!plano) throw new NotFoundException('Plano não encontrado');

    const config = PRECOS[plano.tipo];
    const agora = new Date();
    const expiraEm = new Date(agora.getTime() + config.dias * 24 * 60 * 60 * 1000);

    plano.status = StatusPlano.ATIVO;
    plano.ativoEm = agora;
    plano.expiraEm = expiraEm;
    await this.planoRepo.save(plano);

    await this.userRepo.update(plano.userId, {
      planoAtivo: plano.tipo,
      planoExpiraEm: expiraEm,
    } as any);

    const tipoLabel = this.tipoLabel(plano.tipo);
    await this.notifications.criar(
      plano.userId,
      'plano',
      'Plano Aprovado!',
      `O teu plano ${tipoLabel} foi aprovado! Válido até ${this.formatarData(expiraEm)}.`,
      { tipo: 'plano', accao: 'plano_aprovado', planoId: plano.id },
    );
    return { message: 'Plano aprovado', expiraEm };
  }

  async rejeitar(planoId: string, motivo: string) {
    const plano = await this.planoRepo.findOne({ where: { id: planoId }, relations: ['user'] });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    plano.status = StatusPlano.REJEITADO;
    plano.motivoRejeicao = motivo;
    await this.planoRepo.save(plano);
    await this.notifications.criar(
      plano.userId,
      'plano',
      'Plano Recusado',
      `O teu plano foi recusado. Motivo: ${motivo}`,
      { tipo: 'plano', accao: 'plano_rejeitado', planoId: plano.id },
    );
    return { message: 'Plano rejeitado' };
  }

  async obterComprovativo(planoId: string): Promise<{ buffer: Buffer; mime: string }> {
    const plano = await this.planoRepo.findOne({
      where: { id: planoId },
      select: ['comprovativo', 'comprovativoMime'],
    });
    if (!plano || !plano.comprovativo) throw new NotFoundException('Comprovativo não encontrado');
    return {
      buffer: Buffer.isBuffer(plano.comprovativo) ? plano.comprovativo : Buffer.from(plano.comprovativo),
      mime: plano.comprovativoMime || 'image/jpeg',
    };
  }

  async listarMeus(userId: string) {
    return this.planoRepo.find({
      where: { userId },
      order: { criadoEm: 'DESC' },
      select: ['id', 'tipo', 'status', 'valor', 'ativoEm', 'expiraEm', 'motivoRejeicao', 'criadoEm'],
    });
  }

  async planoAtivo(userId: string): Promise<Plano | null> {
    const plano = await this.planoRepo.findOne({
      where: { userId, status: StatusPlano.ATIVO },
      order: { expiraEm: 'DESC' },
    });
    // Verificar se o plano já expirou
    if (plano && plano.expiraEm && plano.expiraEm < new Date()) {
      plano.status = StatusPlano.EXPIRADO;
      await this.planoRepo.save(plano);
      await this.userRepo.update(userId, {
        planoAtivo: null,
        planoExpiraEm: null,
      } as any);
      return null;
    }
    return plano;
  }

  async listarTodos(filtros?: { tipo?: string; status?: string; search?: string }) {
    const qb = this.planoRepo.createQueryBuilder('plano')
      .leftJoinAndSelect('plano.user', 'user')
      .select([
        'plano.id', 'plano.tipo', 'plano.status', 'plano.valor',
        'plano.ativoEm', 'plano.expiraEm', 'plano.motivoRejeicao', 'plano.comprovativoMime', 'plano.criadoEm',
        'user.id', 'user.nome', 'user.sobrenome', 'user.email', 'user.telefone',
        'user.fotoPerfil', 'user.fotoPerfilUrl',
      ])
      .orderBy('plano.criadoEm', 'DESC');

    if (filtros?.tipo) qb.andWhere('plano.tipo = :tipo', { tipo: filtros.tipo });
    if (filtros?.status) qb.andWhere('plano.status = :status', { status: filtros.status });
    if (filtros?.search) {
      qb.andWhere(
        '(user.nome LIKE :s OR user.sobrenome LIKE :s OR user.email LIKE :s OR user.telefone LIKE :s)',
        { s: `%${filtros.search}%` },
      );
    }

    return qb.getMany();
  }

  async obterEstatisticas() {
    const planos = await this.planoRepo.find({ where: { status: StatusPlano.ATIVO } });
    let totalSemanal = 0;
    let totalMensal = 0;
    let totalDiario = 0;
    for (const p of planos) {
      if (p.tipo === TipoPlano.SEMANAL) totalSemanal += Number(p.valor);
      else if (p.tipo === TipoPlano.MENSAL) totalMensal += Number(p.valor);
      else if (p.tipo === TipoPlano.DIARIO) totalDiario += Number(p.valor);
    }
    const activos = planos.length;
    const pendentes = await this.planoRepo.count({ where: { status: StatusPlano.PENDENTE } });
    return { totalSemanal, totalMensal, totalDiario, totalGeral: totalSemanal + totalMensal + totalDiario, activos, pendentes };
  }

  // ── Helpers ──────────────────────────────────────────────────────────
  private tipoLabel(tipo: TipoPlano): string {
    const labels: Record<TipoPlano, string> = {
      [TipoPlano.GRATUITO]: 'Gratuito',
      [TipoPlano.DIARIO]: 'Diário',
      [TipoPlano.SEMANAL]: 'Semanal',
      [TipoPlano.MENSAL]: 'Mensal',
    };
    return labels[tipo] || tipo;
  }

  private formatarData(data: Date): string {
    return data.toLocaleDateString('pt-AO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
