import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { HealthController } from './health.controller';
import { PublicFormController, AdminInboxController } from './public-form.controller';
import { ErrorReportPublicController, ErrorReportAdminController } from './error-report.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [ContentController, HealthController, PublicFormController, AdminInboxController, ErrorReportPublicController, ErrorReportAdminController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}

