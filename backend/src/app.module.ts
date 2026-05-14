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
import { RewardModule } from './reward/reward.module';
import { MessageModule } from './message/message.module';
import { CronModule } from './common/cron/cron.module';
import { PageContentModule } from './page-content/page-content.module';
import { StorageModule } from './common/storage/storage.module';
import { SocialModule } from './social/social.module';
import { N8nModule } from './n8n/n8n.module';
import { SeoModule } from './common/seo/seo.module';
import { StoryboardModule } from './storyboard/storyboard.module';
import { SeedController } from './seed.controller';

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
    RewardModule,
    MessageModule,
    CronModule,
    PageContentModule,
    StorageModule,
    SocialModule,
    StoryboardModule,
    N8nModule,
    SeoModule,
  ],
  controllers: [SeedController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
