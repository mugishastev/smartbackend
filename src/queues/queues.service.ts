import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { getRedisOptions } from './redis.connection';

export type QueueName =
  | 'email'
  | 'otp'
  | 'webhooks'
  | 'reports'
  | 'notifications';

@Injectable()
export class QueuesService {
  private readonly queues = new Map<QueueName, Queue>();

  constructor(private readonly config: ConfigService) {}

  private getQueue(name: QueueName): Queue {
    const existing = this.queues.get(name);
    if (existing) return existing;

    const queue = new Queue(name, {
      connection: getRedisOptions(this.config),
      defaultJobOptions: {
        removeOnComplete: 1000,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    this.queues.set(name, queue);
    return queue;
  }

  async enqueueEmail(payload: Record<string, any>): Promise<string> {
    const job = await this.getQueue('email').add('send', payload);
    return job.id as string;
  }

  async enqueueOtp(payload: Record<string, any>): Promise<string> {
    const job = await this.getQueue('otp').add('send', payload);
    return job.id as string;
  }

  async enqueueWebhook(payload: Record<string, any>): Promise<string> {
    const job = await this.getQueue('webhooks').add('process', payload);
    return job.id as string;
  }

  async enqueueReport(payload: Record<string, any>): Promise<string> {
    const job = await this.getQueue('reports').add('generate', payload);
    return job.id as string;
  }

  async enqueueNotification(payload: Record<string, any>): Promise<string> {
    const job = await this.getQueue('notifications').add('dispatch', payload);
    return job.id as string;
  }
}
