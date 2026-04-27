import { Module } from '@nestjs/common';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AiCheckerService } from './ai-checker.service';

@Module({
  imports: [PrismaModule],
  controllers: [EditorController],
  providers: [EditorService, AiCheckerService],
  exports: [EditorService],
})
export class EditorModule {}
