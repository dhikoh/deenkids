import { Module, forwardRef } from '@nestjs/common';
import { CronService } from './cron.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RewardModule } from '../../reward/reward.module';
import { SocialModule } from '../../social/social.module';

@Module({
  imports: [PrismaModule, forwardRef(() => RewardModule), SocialModule],
  providers: [CronService],
  exports: [CronService],
})
export class CronModule {}
