import { Controller, Get, Post, Delete, Param, UseGuards, ParseIntPipe, Request, Query } from '@nestjs/common';
import { AttendeesService } from './attendees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events/:id/attendees')
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all attendees for an event' })
  @ApiResponse({ status: 200, description: 'Return all attendees.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  getAttendees(@Param('id', ParseIntPipe) eventId: number) {
    return this.attendeesService.getEventAttendees(eventId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register as an attendee for an event' })
  @ApiResponse({ status: 201, description: 'Successfully registered. Returns CONFIRMED or WAITLISTED status.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({ status: 409, description: 'Already registered.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  register(@Param('id', ParseIntPipe) eventId: number, @Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.register(eventId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Leave an event (cancel registration)' })
  @ApiResponse({ status: 200, description: 'Successfully left the event.' })
  @ApiResponse({ status: 404, description: 'Registration not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  leave(@Param('id', ParseIntPipe) eventId: number, @Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.leave(eventId, userId);
  }
}

@ApiTags('attendees')
@Controller('attendees')
export class AttendeesRecommendationsController {
  constructor(private readonly attendeesService: AttendeesService) {}

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommended sessions for authenticated attendee' })
  @ApiQuery({ name: 'topic', required: false, description: 'Filter by topic/category' })
  @ApiQuery({ name: 'day', required: false, description: 'Filter by day (Day 1, Day 2, or day of week)' })
  @ApiQuery({ name: 'track', required: false, description: 'Filter by track (same as topic for now)' })
  @ApiResponse({ status: 200, description: 'Return recommended sessions.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getRecommendations(
    @Request() req: any,
    @Query('topic') topic?: string,
    @Query('day') day?: string,
    @Query('track') track?: string,
  ) {
    const userId = req.user.userId;
    return this.attendeesService.getRecommendedSessions(userId, { topic, day, track });
  }
}
