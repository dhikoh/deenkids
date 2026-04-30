import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads/messages',
        filename: (_, file, cb) => cb(null, `${uuid()}${extname(file.originalname)}`),
      }),
      fileFilter: (_, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|svg|webp)$/i;
        if (allowed.test(extname(file.originalname))) cb(null, true);
        else cb(new Error('Hanya file gambar (JPG, PNG, SVG, WebP) yang diizinkan'), false);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  ],
  controllers: [MessageController],
  providers: [MessageService, MessageGateway],
  exports: [MessageService, MessageGateway],
})
export class MessageModule {}

