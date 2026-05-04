import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { SocialTokenService } from './social-token.service';
import { SocialCaptionService } from './social-caption.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SocialController],
  providers: [SocialService, SocialTokenService, SocialCaptionService],
  exports: [SocialService],
})
export class SocialModule {}
