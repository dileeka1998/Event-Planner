import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private http: HttpService) {}

  async parseBrief(dto: { text: string }) {
    this.logger.log('Sending brief to AI service for parsing');
    try {
      const res = await firstValueFrom(this.http.post('/parse-brief', dto));
      this.logger.log('Successfully parsed brief from AI service');
      return res.data as { estimatedAudience?: number; budgetLkr?: number; tracks?: number };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to parse brief from AI service: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
