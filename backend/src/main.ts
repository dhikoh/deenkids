import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map((url: string) => url.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

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
      .setTitle('DeenKids API')
      .setDescription('Platform Parenting Islami — Sesuai Alquran, Hadis dan Pemahaman para Sahabat')
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

  logger.log(`🚀 DeenKids Backend running on port ${port}`);
}
bootstrap();
