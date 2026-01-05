import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';

import { AppModule } from './app.module';
import { getRedisOptions } from './queues/redis.connection';

async function bootstrapWorker(): Promise<void> {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  const config = appContext.get(ConfigService);
  const connection = getRedisOptions(config);

  const workers = [
    new Worker(
      'email',
      async () => {
        return;
      },
      { connection }
    ),
    new Worker(
      'otp',
      async () => {
        return;
      },
      { connection }
    ),
    new Worker(
      'webhooks',
      async () => {
        return;
      },
      { connection }
    ),
    new Worker(
      'reports',
      async () => {
        return;
      },
      { connection }
    ),
    new Worker(
      'notifications',
      async () => {
        return;
      },
      { connection }
    ),
  ];

  for (const w of workers) {
    w.on('failed', (job, err) => {
      const jobId = job?.id;
      console.error(`[WORKER] job failed queue=${w.name} id=${jobId}`, err);
    });
  }

  const shutdown = async () => {
    for (const w of workers) {
      await w.close();
    }
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });
}

void bootstrapWorker();
