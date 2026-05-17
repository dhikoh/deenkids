import { Module, Global } from '@nestjs/common';
import { IndexNowService } from './indexnow.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [IndexNowService],
  exports: [IndexNowService],
})
export class SeoModule {}
