import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { UserManagementController } from './user-management.controller';
import { ProfileController } from './profile.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardModule } from '../reward/reward.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [PrismaModule, RewardModule, NotificationModule],
  controllers: [AdminController, UserManagementController, ProfileController],
  providers: [AdminService],
})
export class AdminModule {}
