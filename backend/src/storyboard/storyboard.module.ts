import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';
import { StoryboardController } from './storyboard.controller';
import { StoryboardService } from './storyboard.service';

@Module({
  imports: [PrismaModule, ConfigModule, StorageModule],
  controllers: [StoryboardController],
  providers: [StoryboardService],
  exports: [StoryboardService],
})
export class StoryboardModule {}
