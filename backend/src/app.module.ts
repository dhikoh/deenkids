import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { EditorModule } from './editor/editor.module';
import { EngagementModule } from './engagement/engagement.module';
import { AdminModule } from './admin/admin.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { NotificationModule } from './notification/notification.module';
import { SeedController } from './seed.controller';
import { CronService } from './common/cron/cron.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    PrismaModule,
    AuthModule,
    ContentModule,
    EditorModule,
    EngagementModule,
    AdminModule,
    SuperadminModule,
    NotificationModule,
  ],
  controllers: [SeedController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    CronService,
  ],
})
export class AppModule {}
