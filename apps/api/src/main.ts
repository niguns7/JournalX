import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://127.0.0.1:5173,http://localhost:5173',
  );

  app.enableCors({
    origin: corsOrigin.split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/live', 'health/ready', 'api/docs', 'api/docs-json'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Configure Swagger OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('JournalX API')
    .setDescription('Personal Trading Journal REST API Specification')
    .setVersion('1.0.0')
    .addTag('Settings', 'Application singleton preferences')
    .addTag('Accounts', 'Personal trading accounts')
    .addTag('Instruments', 'Market instruments and specifications')
    .addTag('Strategies', 'Strategy definitions and immutable versions')
    .addTag('Journals', 'Daily journals, preparation, analyses, and reviews')
    .addTag('Trades', 'Trade lifecycle, execution, management, and review')
    .addTag('Attachments', 'Chart screenshot uploads and evidence')
    .addTag('Analytics', 'Performance metrics and equity curves')
    .addTag('Exports', 'CSV exports')
    .addTag('Health', 'System health and readiness probes')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Write OpenAPI spec file for client generation
  try {
    const apiSpecsDir = path.resolve(process.cwd(), '../../packages/api-client');
    if (!fs.existsSync(apiSpecsDir)) {
      fs.mkdirSync(apiSpecsDir, { recursive: true });
    }
    fs.writeFileSync(
      path.join(apiSpecsDir, 'openapi.json'),
      JSON.stringify(document, null, 2),
    );
  } catch (err) {
    logger.warn('Could not write openapi.json directly during bootstrap:', err);
  }

  await app.listen(port);
  logger.log(`JournalX API is running on: http://localhost:${port}`);
  logger.log(`OpenAPI documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`Health live endpoint: http://localhost:${port}/health/live`);
}

bootstrap();
