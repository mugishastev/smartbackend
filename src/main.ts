import 'reflect-metadata';

import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
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

  // Register fastify-multer content parser
  const { contentParser } = require('fastify-multer');
  await app.register(contentParser);

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
    }),
  );

  const port = Number(process.env.PORT || 5001);
  console.log('BOOTSTRAP: Listening on port', port);

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
