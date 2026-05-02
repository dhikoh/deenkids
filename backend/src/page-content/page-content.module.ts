import { Module, OnModuleInit } from '@nestjs/common';
import { PageContentService } from './page-content.service';
import { PageContentController } from './page-content.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PageContentController],
  providers: [PageContentService],
  exports: [PageContentService],
})
export class PageContentModule implements OnModuleInit {
  constructor(private readonly pageContentService: PageContentService) {}

  async onModuleInit() {
    // Ensure default pages exist on startup
    await this.pageContentService.ensureDefaults();
  }
}
