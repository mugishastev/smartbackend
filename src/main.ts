import 'reflect-metadata';

import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
// Restart trigger
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  console.log('BOOTSTRAP: Starting...');

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
  );

  app.setGlobalPrefix('api');

  // Register @fastify/multipart
  await app.register(require('@fastify/multipart'), {
    // attachFieldsToBody: 'keyValues', // Disabled to allow manual multipart processing in helper
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
  });

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.error('Validation Errors:', JSON.stringify(errors, null, 2));
        return new BadRequestException(errors);
      },
    }),
  );

  const port = Number(process.env.PORT || 5001);
  console.log('BOOTSTRAP: Listening on port', port);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
