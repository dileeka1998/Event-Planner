import { Controller, Get, Post, Delete, Param, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { AttendeesService } from './attendees.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

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

