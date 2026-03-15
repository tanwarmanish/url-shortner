import * as crypto from 'crypto';

// Polyfill globalThis.crypto for Node < 19 (required by @nestjs/schedule)
if (!globalThis.crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  let isShuttingDown = false;

  app.enableShutdownHooks();

  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    console.log(`[Shutdown] Received ${signal}. Closing backend server...`);

    try {
      await app.close();
      console.log('[Shutdown] Backend server closed. Port released.');
      process.exit(0);
    } catch (error) {
      console.error('[Shutdown] Error while closing backend server:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('uncaughtException', (error) => {
    console.error('[Crash] Uncaught exception:', error);
    void shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Crash] Unhandled rejection:', reason);
    void shutdown('unhandledRejection');
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://localhost:4202',
      'http://localhost:5173',
      'http://127.0.0.1:4200',
      'http://127.0.0.1:4201',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  });

  // Enable global validation pipe for all incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if extra properties sent
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('URL Shortener API')
    .setDescription('A what3words-style URL shortener service')
    .setVersion('1.0')
    .addTag('urls', 'URL shortening operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
