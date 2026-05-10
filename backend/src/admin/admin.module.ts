import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { ReviewService } from './review.service';
import { StructureService } from './structure.service';
import { AdminController } from './admin.controller';
import { UserManagementController } from './user-management.controller';
import { ProfileController } from './profile.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { RewardModule } from '../reward/reward.module';
import { NotificationModule } from '../notification/notification.module';
import { N8nModule } from '../n8n/n8n.module';

@Module({
  imports: [PrismaModule, RewardModule, NotificationModule, N8nModule],
  controllers: [AdminController, UserManagementController, ProfileController],
  providers: [AdminService, ReviewService, StructureService],
})
export class AdminModule {}
