import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { EditorModule } from './editor/editor.module';
import { EngagementModule } from './engagement/engagement.module';

@Module({
  imports: [
    // Global Configs
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute per IP
    }]),
    
    // Core Modules
    PrismaModule,
    
    // Feature Modules
    AuthModule,
    ContentModule,
    EditorModule,
    EngagementModule,
  ],
  controllers: [SeedController],
  providers: [],
})
export class AppModule {}
