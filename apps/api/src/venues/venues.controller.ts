import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('venues')
@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all venues' })
  @ApiResponse({ status: 200, description: 'Return all venues.' })
  findAll() {
    return this.venuesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a venue by ID' })
  @ApiResponse({ status: 200, description: 'Return the venue.' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new venue' })
  @ApiResponse({ status: 201, description: 'The venue has been successfully created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Body() dto: CreateVenueDto) {
    return this.venuesService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a venue' })
  @ApiResponse({ status: 200, description: 'The venue has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Partial<CreateVenueDto>) {
    return this.venuesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a venue' })
  @ApiResponse({ status: 200, description: 'The venue has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Venue not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.venuesService.remove(id);
  }
}

