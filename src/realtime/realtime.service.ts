import { Injectable } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitPaymentUpdate(orderId: string, status: string): void {
    this.gateway.emitPaymentUpdate(orderId, status);
  }

  emitConversationMessage(conversationId: string, payload: unknown): void {
    this.gateway.emitConversationMessage(conversationId, payload);
  }
}
