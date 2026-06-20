import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { FIREBASE_APP } from '../firebase/firebase.module';
import { Notificacao } from './entities/notificacao.entity';
import { UsersService } from '../users/users.service';
import { ChatGateway } from '../chat/chat.gateway';

@Injectable()
export class NotificationsService {
  private logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(FIREBASE_APP) private firebaseApp: admin.app.App,
    @InjectRepository(Notificacao) private notifRepo: Repository<Notificacao>,
    private usersService: UsersService,
    private chatGateway: ChatGateway,
  ) {}

  async enviarPush(fcmToken: string, titulo: string, corpo: string, dados?: Record<string, any>) {
    if (!fcmToken) return;

    try {
      await admin.messaging(this.firebaseApp).send({
        token: fcmToken,
        notification: { title: titulo, body: corpo },
        data: dados || {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (err : any) {
      this.logger.error(`Erro ao enviar push: ${err.message}`);
    }
  }

  async criar(userId: string, tipo: string, titulo: string, mensagem: string, dados?: Record<string, any>) {
    const notif = this.notifRepo.create({
      userId,
      tipo,
      titulo,
      mensagem,
      dados,
    });

    await this.notifRepo.save(notif);

    // Envia push se o user tiver token
    const user = await this.usersService.buscarPorId(userId);
    if (user?.fcmToken) {
      await this.enviarPush(user.fcmToken, titulo, mensagem, dados);
    }

    // Emitir via socket para o utilizador
    try {
      this.chatGateway.server.to(`user_${userId}`).emit('notification:new', {
        id: notif.id,
        tipo,
        titulo,
        mensagem,
        dados,
        criadoEm: notif.criadoEm,
      });
    } catch {}

    return notif;
  }

  async listarPorUsuario(userId: string) {
    return this.notifRepo.find({
      where: { userId },
      order: { criadoEm: 'DESC' },
    });
  }

  async marcarComoLida(id: string) {
    await this.notifRepo.update(id, { lida: true });
    return { message: 'Marcada como lida' };
  }

  // ── Envio em massa (admin) ────────────────────────────────────────

  async enviarParaUsuario(userId: string, titulo: string, mensagem: string, tipo: string = 'info') {
    return this.criar(userId, tipo, titulo, mensagem, { tipo, origem: 'admin' });
  }

  async enviarParaUsuarios(userIds: string[], titulo: string, mensagem: string, tipo: string = 'info') {
    const resultados: Notificacao[] = [];
    for (const userId of userIds) {
      try {
        const notif = await this.criar(userId, tipo, titulo, mensagem, { tipo, origem: 'admin' });
        resultados.push(notif);
      } catch (err: any) {
        this.logger.error(`Erro ao enviar notificação para ${userId}: ${err.message}`);
      }
    }
    return { enviados: resultados.length, total: userIds.length };
  }

  async enviarParaGrupo(role: string, titulo: string, mensagem: string, tipo: string = 'info') {
    const users = await this.usersService.listarPorRole(role);
    const resultados: Notificacao[] = [];
    for (const user of users) {
      try {
        const notif = await this.criar(user.id, tipo, titulo, mensagem, { tipo, origem: 'admin', grupo: role });
        resultados.push(notif);
      } catch (err: any) {
        this.logger.error(`Erro ao enviar notificação para ${user.id}: ${err.message}`);
      }
    }
    return { enviados: resultados.length, total: users.length };
  }

  async enviarParaTodos(titulo: string, mensagem: string, tipo: string = 'info') {
    const users = await this.usersService.listarTodos();
    const resultados: Notificacao[] = [];
    for (const user of users) {
      try {
        const notif = await this.criar(user.id, tipo, titulo, mensagem, { tipo, origem: 'admin' });
        resultados.push(notif);
      } catch (err: any) {
        this.logger.error(`Erro ao enviar notificação para ${user.id}: ${err.message}`);
      }
    }
    return { enviados: resultados.length, total: users.length };
  }

  // Templates prontos — usam criar() para persistir + push
  async notificarPedidoAceite(userId: string, numeroPedido: string) {
    await this.criar(
      userId,
      'pedido_aceite',
      '✅ Pedido aceite!',
      `O pedido ${numeroPedido} foi aceite por um motoqueiro.`,
      { tipo: 'pedido_aceite', numeroPedido },
    );
  }

  async notificarPedidoEntregue(userId: string, numeroPedido: string) {
    await this.criar(
      userId,
      'pedido_entregue',
      '📦 Entregue!',
      `O pedido ${numeroPedido} foi entregue com sucesso.`,
      { tipo: 'pedido_entregue', numeroPedido },
    );
  }

  async notificarNovoPedidoParaMotoqueiro(motoqueiroUserId: string, numeroPedido: string, valorEntrega: number, distanciaKm: number, pedidoId: string) {
    await this.criar(
      motoqueiroUserId,
      'novo_pedido',
      '🏍️ Novo Pedido!',
      `Entrega de ${distanciaKm.toFixed(1)}km · ${valorEntrega.toLocaleString('pt-AO')} Kz`,
      { tipo: 'novo_pedido', numeroPedido, pedidoId, valorEntrega: String(valorEntrega) },
    );
  }

  async notificarStatusPedido(clienteId: string, numeroPedido: string, status: string, pedidoId: string) {
    const configs: Record<string, { titulo: string; mensagem: string }> = {
      a_caminho_recolha: { titulo: '🛵 Motoqueiro a caminho', mensagem: `O motoqueiro já vai a caminho de si para o pedido ${numeroPedido}.` },
      recolhido:         { titulo: '📦 Encomenda recolhida', mensagem: `A sua encomenda do pedido ${numeroPedido} já foi recolhida pelo motoqueiro.` },
      entregando:        { titulo: '🚀 A caminho do destino', mensagem: `O motoqueiro está a levar a sua encomenda (${numeroPedido}) ao destino.` },
      em_pausa:          { titulo: '⏸️ Entrega em pausa', mensagem: `A entrega do pedido ${numeroPedido} foi pausada pelo motoqueiro.` },
    };
    const cfg = configs[status];
    if (!cfg) return;
    await this.criar(clienteId, 'status_pedido', cfg.titulo, cfg.mensagem, { tipo: 'status_pedido', numeroPedido, pedidoId, status });
  }
}