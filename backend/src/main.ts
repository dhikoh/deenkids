import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('DeenKids API')
    .setDescription('Platform Parenting Islami (Manhaj Salaf)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Prefix & Port
  app.setGlobalPrefix('api');
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 DeenKids Backend is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger Docs available at: http://localhost:${port}/api/docs`);
}
bootstrap();
