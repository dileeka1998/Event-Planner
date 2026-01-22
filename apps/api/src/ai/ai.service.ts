import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private http: HttpService) {}

  async parseBrief(dto: { text: string }): Promise<{
    estimatedAudience?: number;
    budgetLkr?: number;
    tracks?: number;
    title?: string;
    venueName?: string;
    venueCapacity?: number;
    startDate?: string;
    endDate?: string;
    budgetItems?: Array<{ description: string; amount: number }>;
    rooms?: Array<{ name: string; capacity: number }>;
    sessions?: Array<{ title: string; speaker?: string; roomName?: string; durationMin: number }>;
  }> {
    this.logger.log('Sending brief to AI service for parsing');
    try {
      const res = await firstValueFrom(this.http.post('/parse-brief', dto));
      this.logger.log('Successfully parsed brief from AI service');
      const data = res.data as { 
        estimatedAudience?: number; 
        budgetLkr?: number; 
        tracks?: number;
        title?: string;
        venueName?: string;
        venueCapacity?: number;
        startDate?: string;
        endDate?: string;
        budgetItems?: Array<{ description: string; amount: number }>;
        rooms?: Array<{ name: string; capacity: number }>;
        sessions?: Array<{ title: string; speaker?: string; roomName?: string; durationMin: number }>;
      };
      this.logger.log(`AI parsed - estimatedAudience: ${data.estimatedAudience}, budgetLkr: ${data.budgetLkr}, title: ${data.title}, venue: ${data.venueName}`);
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to parse brief from AI service: ${errorMessage}`, errorStack);
      throw error;
    }
  }

  async scheduleEvent(dto: {
    eventId: number;
    startDate: string;
    endDate: string;
    gapMinutes?: number;
    sessions: Array<{
      id: number;
      title: string;
      speaker?: string | null;
      durationMin: number;
      topic: string;
      capacity: number;
    }>;
    rooms: Array<{
      id: number;
      name: string;
      capacity: number;
    }>;
  }): Promise<{
    assignments: Array<{
      sessionId: number;
      roomId?: number | null;
      startTime?: string | null;
    }>;
    success: boolean;
    message?: string;
  }> {
    this.logger.log(`Sending schedule request to AI service for event ${dto.eventId}`);
    try {
      const res = await firstValueFrom(this.http.post('/schedule-event', dto));
      this.logger.log('Successfully generated schedule from AI service');
      const data = res.data as {
        assignments: Array<{
          sessionId: number;
          roomId?: number | null;
          startTime?: string | null;
        }>;
        success: boolean;
        message?: string;
      };
      this.logger.log(`Schedule generated - success: ${data.success}, assignments: ${data.assignments.length}`);
      return data;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to generate schedule from AI service: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
