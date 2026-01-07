import 'reflect-metadata';

import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import rawBody from 'fastify-raw-body';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
    }),
    {
      bodyParser: false,
    }
  );

  await app.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
    routes: ['/api/webhooks/(.*)'],
  });

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: true,
    credentials: true,
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
    })
  );

  const port = Number(process.env.PORT || 5001);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
