import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('rooms')
@Controller('events/:eventId/rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new room for an event (Organizer only)' })
  @ApiResponse({ status: 201, description: 'Room successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., validation error, capacity exceeds venue capacity).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not event organizer).' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async create(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() createRoomDto: CreateRoomDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.roomsService.create(eventId, createRoomDto, organizerId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all rooms for an event' })
  @ApiResponse({ status: 200, description: 'Return all rooms for the event.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  async findAll(@Param('eventId', ParseIntPipe) eventId: number) {
    return this.roomsService.findAll(eventId);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get a specific room by ID for an event' })
  @ApiResponse({ status: 200, description: 'Return the room.' })
  @ApiResponse({ status: 404, description: 'Event or Room not found.' })
  async findOne(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
  ) {
    return this.roomsService.findOne(eventId, roomId);
  }

  @Put(':roomId')
  @ApiOperation({ summary: 'Update a room for an event (Organizer only)' })
  @ApiResponse({ status: 200, description: 'Room successfully updated.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Event or Room not found.' })
  async update(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() updateRoomDto: Partial<CreateRoomDto>,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.roomsService.update(eventId, roomId, updateRoomDto, organizerId);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a room from an event (Organizer only)' })
  @ApiResponse({ status: 204, description: 'Room successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad Request (room is assigned to sessions).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Event or Room not found.' })
  async remove(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('roomId', ParseIntPipe) roomId: number,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.roomsService.remove(eventId, roomId, organizerId);
  }
}
