import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AiService } from '../ai/ai.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly ai: AiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all events' })
  @ApiResponse({ status: 200, description: 'Return all events.' })
  getAll() {
    return this.events.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'The event has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() dto: CreateEventDto) {
    if (dto.brief) {
      try {
        const parsed = await this.ai.parseBrief({ text: dto.brief });
        dto.expectedAudience = dto.expectedAudience ?? parsed?.estimatedAudience ?? undefined;
        if (!dto.budget && parsed?.budgetLkr) {
          dto.budget = String(parsed.budgetLkr);
        }
      } catch (error) {
        // The AI service is optional, so we don't rethrow the error.
        // The logger in the AiService will have already logged the failure.
      }
    }
    return this.events.create(dto);
  }
}
