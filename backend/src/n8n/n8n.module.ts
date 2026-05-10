import { Module } from '@nestjs/common';
import { N8nController } from './n8n.controller';
import { N8nService } from './n8n.service';
import { N8nPromptService } from './n8n-prompt.service';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [N8nController],
  providers: [N8nService, N8nPromptService],
  exports: [N8nService],
})
export class N8nModule {}
