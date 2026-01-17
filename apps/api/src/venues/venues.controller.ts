import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe, Request } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '../users/user.entity';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all venues - returns all venues for admins, organizer venues for organizers' })
  @ApiResponse({ status: 200, description: 'Return all venues (admin) or venues for the organizer.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAll(@Request() req: any) {
    // If user is admin, return all venues (no organizer filter)
    if (req.user.role === UserRole.ADMIN) {
      return this.venuesService.findAll(); // No organizerId = all venues
    }
    // Otherwise, return only venues for this organizer
    const organizerId = req.user.userId;
    return this.venuesService.findAll(organizerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a venue by ID (Organizer only)' })
  @ApiResponse({ status: 200, description: 'Return the venue.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not venue organizer).' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const organizerId = req.user.userId;
    return this.venuesService.findOne(id, organizerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new venue (Organizer only)' })
  @ApiResponse({ status: 201, description: 'The venue has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() dto: CreateVenueDto, @Request() req: any) {
    const organizerId = req.user.userId;
    return this.venuesService.create(dto, organizerId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a venue (Organizer only)' })
  @ApiResponse({ status: 200, description: 'The venue has been successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not venue organizer).' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateVenueDto>, @Request() req: any) {
    const organizerId = req.user.userId;
    return this.venuesService.update(id, dto, organizerId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a venue (Organizer only)' })
  @ApiResponse({ status: 200, description: 'The venue has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (user is not venue organizer).' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  remove(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const organizerId = req.user.userId;
    return this.venuesService.remove(id, organizerId);
  }
}

