import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server!: Server;

  private readonly paymentSockets = new Map<string, string>();

  handleConnection(client: Socket): void {
    // connection hook
  }

  handleDisconnect(client: Socket): void {
    for (const [orderId, socketId] of this.paymentSockets.entries()) {
      if (socketId === client.id) {
        this.paymentSockets.delete(orderId);
        break;
      }
    }
  }

  @SubscribeMessage('registerForOrderUpdates')
  onRegisterForOrderUpdates(
    @MessageBody() orderId: string,
    @ConnectedSocket() socket: Socket
  ): void {
    if (orderId) {
      this.paymentSockets.set(orderId, socket.id);
    }
  }

  @SubscribeMessage('joinConversation')
  onJoinConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket
  ): void {
    if (conversationId) {
      void socket.join(conversationId);
    }
  }

  @SubscribeMessage('leaveConversation')
  onLeaveConversation(
    @MessageBody() conversationId: string,
    @ConnectedSocket() socket: Socket
  ): void {
    if (conversationId) {
      void socket.leave(conversationId);
    }
  }

  emitPaymentUpdate(orderId: string, status: string): void {
    const socketId = this.paymentSockets.get(orderId);
    if (!socketId) return;

    this.server.to(socketId).emit('payment:update', {
      orderId,
      status,
    });

    this.paymentSockets.delete(orderId);
  }

  emitConversationMessage(conversationId: string, payload: unknown): void {
    this.server.to(conversationId).emit('chat:message', payload);
  }
}
