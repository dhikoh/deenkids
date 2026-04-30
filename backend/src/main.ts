import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Ensure uploads directories exist
  const uploadDirs = ['uploads/proofs', 'uploads/banners', 'uploads/messages'];
  for (const dir of uploadDirs) {
    const fullPath = join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
  }

  // Serve uploaded files statically
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

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
  // Always allow localhost for development
  origins.add('http://localhost:3000');
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
