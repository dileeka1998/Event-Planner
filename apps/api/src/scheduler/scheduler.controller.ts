import { Controller, Post, Param, ParseIntPipe, UseGuards, Request, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduleEventResponseDto, ScheduleEventRequestDto, ScheduleApplyDto } from './dto/schedule-event.dto';

@ApiTags('scheduler')
@Controller('events/:eventId/schedule')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate AI-powered schedule for an event (Organizer only). Use dryRun=true for preview mode.' })
  @ApiResponse({ status: 200, description: 'Schedule generated successfully.', type: ScheduleEventResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., no sessions/rooms, scheduling failed).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not event organizer).' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async generateSchedule(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: ScheduleEventRequestDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.schedulerService.generateSchedule(eventId, organizerId, dto.gapMinutes || 0, dto.dryRun || false, dto.startTime);
  }

  @Post('apply')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a generated schedule to the database (Organizer only)' })
  @ApiResponse({ status: 200, description: 'Schedule applied successfully.', type: ScheduleEventResponseDto })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid assignments).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not event organizer).' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async applySchedule(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: ScheduleApplyDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.schedulerService.applySchedule(eventId, organizerId, dto.assignments);
  }
}
