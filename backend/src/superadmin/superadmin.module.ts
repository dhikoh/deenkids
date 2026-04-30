import { Module } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';
import { SuperadminController } from './superadmin.controller';
import { ExportImportController } from './export-import.controller';
import { BannerController } from './banner.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperadminController, ExportImportController, BannerController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
