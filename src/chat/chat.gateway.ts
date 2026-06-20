import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MensagemChat } from './entities/mensagem.entity';
import * as admin from 'firebase-admin';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    @InjectRepository(MensagemChat)
    private mensagemRepo: Repository<MensagemChat>,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`[Chat] Cliente conectado: ${client.id}`);
    try {
      const userId = client.handshake.auth?.userId || client.handshake.query?.userId;
      const token = client.handshake.auth?.token || client.handshake.query?.token;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Verificar token Firebase se fornecido
      if (token) {
        try {
          const decoded = await admin.auth().verifyIdToken(token as string);
          // Verificar que o token corresponde ao userId
          if (decoded.uid !== userId) {
            console.warn(`[Chat] Token não corresponde ao userId: ${decoded.uid} !== ${userId}`);
            client.disconnect();
            return;
          }
        } catch {
          console.warn('[Chat] Token Firebase inválido, a permitir conexão com userId apenas');
        }
      }

      client.join(`user_${userId}`);
      (client as any).userId = userId;
      console.log(`[Chat] Utilizador ${userId} entrou na sala user_${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`[Chat] Cliente desconectado: ${client.id}`);
  }

  // Admin junta-se à sala role_admin
  @SubscribeMessage('admin:join')
  handleAdminJoin(@ConnectedSocket() client: Socket) {
    client.join('role_admin');
    console.log(`[Chat] Admin ${client.id} entrou na sala role_admin`);
    return { event: 'admin:joined', data: { success: true } };
  }

  // Utilizador junta-se à sua própria sala (chamado pelo cliente após conectar)
  @SubscribeMessage('user:join')
  handleUserJoin(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const authUserId = (client as any).userId;
    if (authUserId && authUserId === data.userId) {
      client.join(`user_${data.userId}`);
      return { event: 'user:joined', data: { userId: data.userId } };
    }
    return { event: 'user:join_failed', data: { error: 'Unauthorized' } };
  }

  // Cliente/Motoqueiro entra na sala do pedido
  @SubscribeMessage('order:join')
  handleJoin(@MessageBody() data: { pedidoId: string }, @ConnectedSocket() client: Socket) {
    client.join(`pedido_${data.pedidoId}`);
    return { event: 'order:joined', data: { pedidoId: data.pedidoId } };
  }

  // Enviar mensagem
  @SubscribeMessage('chat:send')
  async handleMessage(
    @MessageBody() data: {
      pedidoId: string;
      remetenteId?: string;
      senderId?: string;
      remetenteTipo?: 'cliente' | 'motoqueiro';
      senderType?: 'cliente' | 'motoqueiro';
      texto?: string;
      text?: string;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const authUserId = (client as any).userId;
    const remetenteId = authUserId || (data.remetenteId ?? data.senderId);
    const remetenteTipo = data.remetenteTipo ?? data.senderType;
    const texto = data.texto ?? data.text;

    const msg = this.mensagemRepo.create({
      pedidoId: data.pedidoId,
      remetenteId,
      remetenteTipo,
      texto,
    });
    const saved = await this.mensagemRepo.save(msg);

    // Emite para todos na sala (incluindo o remetente)
    this.server.to(`pedido_${data.pedidoId}`).emit('chat:received', {
      id: saved.id,
      pedidoId: saved.pedidoId,
      senderId: saved.remetenteId,
      senderType: saved.remetenteTipo,
      text: saved.texto,
      timestamp: saved.criadoEm,
      read: false,
    });

    return { event: 'chat:sent', data: { id: saved.id } };
  }

  // Marcar como lidas
  @SubscribeMessage('chat:read')
  async handleRead(
    @MessageBody() data: { pedidoId: string; messageIds: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    await this.mensagemRepo
      .createQueryBuilder()
      .update()
      .set({ lida: true })
      .where('id IN (:...ids)', { ids: data.messageIds })
      .execute();

    this.server.to(`pedido_${data.pedidoId}`).emit('chat:read', {
      messageIds: data.messageIds,
    });
  }

  // Indicador de "a escrever"
  @SubscribeMessage('chat:typing')
  handleTyping(
    @MessageBody() data: { pedidoId: string; isTyping: boolean; remetenteTipo: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`pedido_${data.pedidoId}`).emit('chat:typing', {
      isTyping: data.isTyping,
      remetenteTipo: data.remetenteTipo,
    });
  }

  // GPS do deliver em tempo real — retransmite para sala do pedido
  @SubscribeMessage('delivery:location')
  handleDeliveryLocation(
    @MessageBody() data: { pedidoId: string; latitude: number; longitude: number },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`pedido_${data.pedidoId}`).emit('delivery:location_update', {
      pedidoId: data.pedidoId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });
  }

  // Buscar histórico de mensagens
  async getHistorico(pedidoId: string) {
    const mensagens = await this.mensagemRepo.find({
      where: { pedidoId },
      order: { criadoEm: 'ASC' },
    });

    return mensagens.map((msg) => ({
      id: msg.id,
      pedidoId: msg.pedidoId,
      senderId: msg.remetenteId,
      senderType: msg.remetenteTipo,
      text: msg.texto,
      timestamp: msg.criadoEm,
      read: msg.lida,
    }));
  }
}