import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MessageService } from './message.service';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/messages',
})
export class MessageGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessageGateway.name);
  // Map<userId, Set<socketId>>
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly messageService: MessageService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      (client as any).userId = payload.sub;

      // Track user → socket mapping
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join user's personal room
      client.join(`user:${payload.sub}`);
      this.logger.log(`✅ WS connected: ${payload.email} (${client.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      sockets?.delete(client.id);
      if (sockets?.size === 0) this.userSockets.delete(userId);
    }
    this.logger.log(`❌ WS disconnected: ${client.id}`);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { receiverId: string; text?: string; attachmentUrl?: string; attachmentType?: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;
    try {
      const result = await this.messageService.sendMessage(
        userId,
        body.receiverId,
        body.text,
        body.attachmentUrl,
        body.attachmentType,
      );
      // Emit to both sender and receiver
      this.server
        .to(`user:${userId}`)
        .to(`user:${body.receiverId}`)
        .emit('new_message', {
          ...result.data,
          conversationId: result.conversationId,
        });
    } catch (e: any) {
      client.emit('error', { message: e.message });
    }
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { conversationId: string },
  ) {
    const userId = (client as any).userId;
    if (!userId) return;
    await this.messageService.markConversationRead(userId, body.conversationId);
    client.emit('read_confirmed', { conversationId: body.conversationId });
  }

  // Utility: emit real-time notification to a specific user
  emitNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('new_notification', notification);
  }
}
