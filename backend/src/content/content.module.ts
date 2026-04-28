import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { HealthController } from './health.controller';
import { PublicFormController, AdminInboxController } from './public-form.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    NotificationModule,
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [ContentController, HealthController, PublicFormController, AdminInboxController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
