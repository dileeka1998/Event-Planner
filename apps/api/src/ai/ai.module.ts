import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AiService } from './ai.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: process.env.AI_BASE_URL || 'http://ai:8000',
      timeout: 10000,
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
