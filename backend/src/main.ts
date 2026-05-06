import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { execSync } from 'child_process';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Auto-sync Prisma schema to database (creates new tables if missing)
  try {
    logger.log('🔄 Running prisma db push to sync schema...');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
    logger.log('✅ Database schema synced successfully');
  } catch (err) {
    logger.warn('⚠️ prisma db push failed — tables may already be up to date');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust reverse proxy (Coolify/Traefik) — reads real IP from X-Forwarded-For
  app.set('trust proxy', true);

  // CORS — must be configured BEFORE helmet
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const rawOrigins = frontendUrl.split(',').map((u: string) => u.trim()).filter(Boolean);
  const origins = new Set<string>();
  for (const url of rawOrigins) {
    origins.add(url);
    // Auto-add www/non-www variant
    if (url.includes('://www.')) {
      origins.add(url.replace('://www.', '://'));
    } else if (url.includes('://') && !url.includes('localhost')) {
      origins.add(url.replace('://', '://www.'));
    }
  }
  // Only allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.add('http://localhost:3000');
  }
  const allowedOrigins = [...origins];
  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  // Security — after CORS so helmet doesn't strip CORS headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Middleware
  app.use(cookieParser());

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Fix BigInt serialization for Prisma
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };

  // Swagger Documentation (only in development)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Adably API')
      .setDescription('Platform Parenting Islami — sesuai Alquran dan Hadist')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('📚 Swagger Docs available at /api/docs');
  }

  // Prefix & Port
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`🚀 Adably Backend running on port ${port}`);
}
bootstrap();
