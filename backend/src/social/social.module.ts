import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialTokenService } from './social-token.service';
import { SocialCaptionService } from './social-caption.service';
import { VideoGeneratorService } from './video-generator.service';
import { YouTubeTokenService } from './youtube-token.service';
import { YouTubeUploadService } from './youtube-upload.service';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [PrismaModule, ConfigModule, StorageModule],
  controllers: [SocialController],
  providers: [SocialService, SocialTokenService, SocialCaptionService, VideoGeneratorService, YouTubeTokenService, YouTubeUploadService],
  exports: [SocialService],
})
export class SocialModule {}
