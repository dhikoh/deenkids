import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { SuperadminService } from './superadmin.service';
import { SuperadminController } from './superadmin.controller';
import { ExportImportController } from './export-import.controller';
import { BannerController } from './banner.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({ dest: './public/audio' }),
  ],
  controllers: [SuperadminController, ExportImportController, BannerController],
  providers: [SuperadminService],
  exports: [SuperadminService],
})
export class SuperadminModule {}
