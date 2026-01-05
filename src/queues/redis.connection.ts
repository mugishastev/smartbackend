import { ConfigService } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export function getRedisOptions(config: ConfigService): RedisOptions {
  const redisUrl = config.get<string>('REDIS_URL');
  if (redisUrl) {
    const url = new URL(redisUrl);
    const isTls = url.protocol === 'rediss:';
    const password = url.password || undefined;

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      password,
      tls: isTls ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  const host = config.get<string>('REDIS_HOST');
  const port = config.get<number>('REDIS_PORT');
  const password = config.get<string>('REDIS_PASSWORD');

  if (!host || !port) {
    throw new Error('Redis is not configured. Provide REDIS_URL or REDIS_HOST + REDIS_PORT.');
  }

  return {
    host,
    port,
    password: password || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
