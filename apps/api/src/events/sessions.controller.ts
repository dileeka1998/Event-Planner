import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events/:eventId/sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new session for an event' })
  @ApiResponse({ status: 201, description: 'The session has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request (invalid room, startTime outside event range, etc.).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the event organizer).' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: CreateSessionDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.sessionsService.create(eventId, dto, organizerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions for an event' })
  @ApiResponse({ status: 200, description: 'Return all sessions for the event.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async findAll(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.sessionsService.findAll(eventId);
  }

  @Put(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a session' })
  @ApiResponse({ status: 200, description: 'The session has been successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the event organizer).' })
  @ApiResponse({ status: 404, description: 'Event or session not found.' })
  async update(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Body() dto: Partial<CreateSessionDto>,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.sessionsService.update(eventId, sessionId, dto, organizerId);
  }

  @Delete(':sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a session' })
  @ApiResponse({ status: 200, description: 'The session has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not the event organizer).' })
  @ApiResponse({ status: 404, description: 'Event or session not found.' })
  async remove(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.sessionsService.remove(eventId, sessionId, organizerId);
  }
}
