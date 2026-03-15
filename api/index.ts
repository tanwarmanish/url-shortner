import * as crypto from 'crypto';
import 'reflect-metadata';

if (!globalThis.crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from '../apps/api/src/app.module';

const server = express();
let cachedApp: Awaited<ReturnType<typeof NestFactory.create>> | null = null;

async function bootstrap() {
  if (cachedApp) return;

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  cachedApp = app;
}

export default async function handler(
  req: { url?: string } & Record<string, unknown>,
  res: Record<string, unknown>,
) {
  await bootstrap();

  // Strip /api prefix so NestJS route matching works unchanged
  if (typeof req.url === 'string') {
    req.url = req.url.replace(/^\/api/, '') || '/';
  }

  server(req as never, res as never);
}
