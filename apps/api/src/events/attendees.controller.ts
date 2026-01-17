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

  @Get('my-registrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all event registrations for authenticated attendee' })
  @ApiResponse({ status: 200, description: 'Return all registrations with event data.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyRegistrations(@Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.getMyRegistrations(userId);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dashboard data for authenticated attendee' })
  @ApiResponse({ status: 200, description: 'Return dashboard data including statistics, upcoming events, and today sessions.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getDashboard(@Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.getDashboardData(userId);
  }

  @Get('my-sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all sessions from events user is registered for' })
  @ApiResponse({ status: 200, description: 'Return sessions from registered events.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMySessions(@Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.getMySessions(userId);
  }

  @Get('available-events')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get events user can register for (not yet registered, not started)' })
  @ApiResponse({ status: 200, description: 'Return available events with capacity info.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAvailableEvents(@Request() req: any) {
    const userId = req.user.userId;
    return this.attendeesService.getAvailableEvents(userId);
  }

  @Get('recommendations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recommended sessions for authenticated attendee' })
  @ApiQuery({ name: 'topic', required: false, description: 'Filter by topic/category' })
  @ApiQuery({ name: 'day', required: false, description: 'Filter by day (Day 1, Day 2, or day of week)' })
  @ApiQuery({ name: 'track', required: false, description: 'Filter by track (same as topic for now)' })
  @ApiQuery({ name: 'showAll', required: false, description: 'If true, show all sessions; if false, only show sessions from registered events', type: Boolean })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)', type: Number })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)', type: Number })
  @ApiResponse({ status: 200, description: 'Return recommended sessions with pagination.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getRecommendations(
    @Request() req: any,
    @Query('topic') topic?: string,
    @Query('day') day?: string,
    @Query('track') track?: string,
    @Query('showAll') showAll?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.userId;
    const showAllBool = showAll === 'true' || showAll === '1';
    const pageNum = page ? parseInt(page, 10) : undefined;
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.attendeesService.getRecommendedSessions(userId, { 
      topic, 
      day, 
      track, 
      showAll: showAllBool,
      page: pageNum,
      limit: limitNum,
    });
  }
}
