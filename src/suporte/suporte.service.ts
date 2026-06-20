import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Suporte } from './entities/suporte.entity';
import { MensagemSuporte } from './entities/mensagem-suporte.entity';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class SuporteService {
  private readonly logger = new Logger(SuporteService.name);

  constructor(
    @InjectRepository(Suporte)
    private repo: Repository<Suporte>,
    @InjectRepository(MensagemSuporte)
    private msgRepo: Repository<MensagemSuporte>,
    private chatGateway: ChatGateway,
  ) {}

  async criar(userId: string, assunto: string, mensagem: string) {
    const ticket = this.repo.create({ userId, assunto, mensagem });
    const saved = await this.repo.save(ticket);
    // Criar mensagem inicial
    await this.msgRepo.save({
      ticketId: saved.id,
      remetenteId: userId,
      remetenteTipo: 'cliente',
      texto: mensagem,
    });
    return saved;
  }

  async listarDoUtilizador(userId: string) {
    return this.repo
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status NOT IN (:...excluidos)', { excluidos: ['eliminado'] })
      .orderBy('s.criadoEm', 'DESC')
      .getMany();
  }

  async buscarPorId(id: string) {
    const ticket = await this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!ticket) throw new NotFoundException('Ticket não encontrado.');
    return ticket;
  }

  // ─── CHAT DE SUPORTE ───────────────────────────────────────
  async enviarMensagem(ticketId: string, remetenteId: string, remetenteTipo: string, texto: string) {
    // Verificar que o ticket existe
    const ticket = await this.repo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado.');

    // Bloquear mensagens em tickets fechados ou eliminados
    if (ticket.status === 'fechado' || ticket.status === 'eliminado') {
      throw new NotFoundException('Ticket não encontrado.');
    }

    // Se o ticket estava resolvido, reabrir
    if (ticket.status === 'resolvido') {
      await this.repo.update(ticketId, { status: 'em_analise' });
    } else if (ticket.status === 'aberto') {
      await this.repo.update(ticketId, { status: 'em_analise' });
    }

    const msg = await this.msgRepo.save({
      ticketId,
      remetenteId,
      remetenteTipo,
      texto,
    });

    const fullMsg = await this.msgRepo.findOne({
      where: { id: msg.id },
      relations: ['remetente'],
    });

    // Emitir evento via socket para tempo real
    try {
      const userId = ticket.userId;
      this.chatGateway.server.to(`user_${userId}`).emit('suporte:new_message', {
        ticketId,
        message: fullMsg,
      });
      this.chatGateway.server.to('role_admin').emit('suporte:new_message', {
        ticketId,
        message: fullMsg,
      });
    } catch {}

    return fullMsg;
  }

  async listarMensagens(ticketId: string) {
    return this.msgRepo.find({
      where: { ticketId },
      relations: ['remetente'],
      order: { criadoEm: 'ASC' },
    });
  }

  async marcarComoLidas(ticketId: string, remetenteTipo: string) {
    // Marcar como lidas as mensagens do outro lado
    const tipoOutro = remetenteTipo === 'admin' ? 'cliente' : 'admin';
    await this.msgRepo.update(
      { ticketId, remetenteTipo: tipoOutro, lida: false },
      { lida: true },
    );
  }

  async contarNaoLidas(ticketId: string, remetenteTipo: string) {
    // Contar mensagens não lidas vindas do outro lado
    const tipoOutro = remetenteTipo === 'admin' ? 'cliente' : 'admin';
    return this.msgRepo.count({
      where: { ticketId, remetenteTipo: tipoOutro, lida: false },
    });
  }

  async alterarStatus(ticketId: string, status: string) {
    const ticket = await this.repo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    ticket.status = status;
    await this.repo.save(ticket);
    this.emitirStatusChange(ticket.userId, ticketId, status);
    return { message: `Ticket actualizado para ${status}` };
  }

  async fechar(ticketId: string) {
    const ticket = await this.repo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    ticket.status = 'fechado';
    await this.repo.save(ticket);
    this.emitirStatusChange(ticket.userId, ticketId, 'fechado');
    return { message: 'Conversa fechada' };
  }

  async eliminar(ticketId: string) {
    const ticket = await this.repo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket não encontrado');
    // Soft delete — marcar como eliminado em vez de apagar
    ticket.status = 'eliminado' as any;
    await this.repo.save(ticket);
    return { message: 'Conversa eliminada' };
  }

  private emitirStatusChange(userId: string, ticketId: string, status: string) {
    try {
      this.chatGateway.server.to(`user_${userId}`).emit('suporte:status_update', { ticketId, status });
      this.chatGateway.server.to('role_admin').emit('suporte:status_update', { ticketId, status });
    } catch {}
  }

  async listarTodosTickets() {
    const tickets = await this.repo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.user', 'user')
      .where('s.status NOT IN (:...excluidos)', { excluidos: ['eliminado'] })
      .orderBy('s.criadoEm', 'DESC')
      .getMany();

    // Contar mensagens não lidas (vindas do cliente) para cada ticket
    const ticketsComNaoLidas = await Promise.all(
      tickets.map(async (t) => {
        const naoLidas = await this.contarNaoLidas(t.id, 'admin');
        return { ...t, mensagensNaoLidas: naoLidas };
      }),
    );
    return ticketsComNaoLidas;
  }

  async eliminarTodos() {
    await this.repo
      .createQueryBuilder()
      .update(Suporte)
      .set({ status: 'eliminado' } as any)
      .where('status NOT IN (:...excluidos)', { excluidos: ['eliminado'] })
      .execute();
    return { message: 'Todas as conversas de suporte foram eliminadas.' };
  }

  /**
   * Eliminar tickets resolvidos/fechados há mais de 30 dias.
   * Executa automaticamente todos os dias às 03:00.
   */
  @Cron('0 3 * * *')
  async limparTicketsAntigos() {
    const limite = new Date();
    limite.setDate(limite.getDate() - 30);

    const result = await this.repo
      .createQueryBuilder()
      .update(Suporte)
      .set({ status: 'eliminado' } as any)
      .where('status IN (:...statuses)', { statuses: ['resolvido', 'fechado'] })
      .andWhere('resolvidoEm < :limite', { limite })
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Limpeza automática: ${result.affected} ticket(s) resolvido(s) há >30 dias eliminados.`);
    }
    return result.affected || 0;
  }
}
