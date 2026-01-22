import { Controller, Get, Post, Body, UseGuards, Param, ParseIntPipe, Request, Patch, Delete } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';
import { AiService } from '../ai/ai.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserRole } from '../users/user.entity';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly ai: AiService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all events - returns all events for admins, organizer events for organizers' })
  @ApiResponse({ status: 200, description: 'Return all events (admin) or events for the organizer.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAll(@Request() req: any) {
    // If user is admin, return all events (no organizer filter)
    if (req.user.role === UserRole.ADMIN) {
      return this.events.findAll(); // No organizerId = all events
    }
    // Otherwise, return only events for this organizer
    const organizerId = req.user.userId;
    return this.events.findAll(organizerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an event by ID' })
  @ApiResponse({ status: 200, description: 'Return the event with venue, budget, and attendees.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.events.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'The event has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Bad Request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async create(@Body() dto: CreateEventDto, @Request() req: any) {
    const organizerId = req.user.userId;
    let parsedData: any = null;
    
    // If brief provided, call AI service to parse and merge fields
    if (dto.brief) {
      try {
        const parsed = await this.ai.parseBrief({ text: dto.brief });
        console.log('AI parsed result:', JSON.stringify(parsed, null, 2));
        console.log('DTO before merge - expectedAudience:', dto.expectedAudience);
        
        // Store parsed data for later use (venue, rooms, sessions)
        parsedData = parsed;
        
        // Use AI parsed value if not already provided
        if (!dto.expectedAudience && parsed?.estimatedAudience) {
          dto.expectedAudience = parsed.estimatedAudience;
        }
        
        if (!dto.budget && parsed?.budgetLkr) {
          dto.budget = String(parsed.budgetLkr);
        }
        
        // Use AI-extracted title if available and title not already set
        if (!dto.title && parsed?.title) {
          dto.title = parsed.title;
        }
        
        // Use AI-extracted dates if not already provided
        if (!dto.startDate && parsed?.startDate) {
          dto.startDate = parsed.startDate;
        }
        if (!dto.endDate && parsed?.endDate) {
          dto.endDate = parsed.endDate;
        }
        
        // Handle venue: find or create if venue name is provided
        if (parsed?.venueName && !dto.venueId) {
          const venue = await this.events.findOrCreateVenue(
            parsed.venueName,
            organizerId,
            parsed.venueCapacity || parsed.estimatedAudience, // Use venue capacity or fallback to expected audience
            parsed.venueName // Use venue name as address if not provided
          );
          dto.venueId = venue.id;
        }
        
        // Convert budget items from parsed data to DTO format
        if (parsed?.budgetItems && parsed.budgetItems.length > 0) {
          if (!dto.budgetItems) {
            dto.budgetItems = [];
          }
          // Merge parsed budget items (avoid duplicates by description)
          const existingDescriptions = new Set(dto.budgetItems.map(item => item.description?.toLowerCase()));
          for (const item of parsed.budgetItems) {
            if (!existingDescriptions.has(item.description.toLowerCase())) {
              // Extract category from description or use description as category
              // Try to infer category from common keywords in description
              const description = item.description.toLowerCase();
              let category = 'General';
              
              // Simple keyword-based category inference (can be enhanced)
              if (description.includes('venue') || description.includes('rental') || description.includes('hall')) {
                category = 'Venue';
              } else if (description.includes('catering') || description.includes('food') || description.includes('beverage')) {
                category = 'Catering';
              } else if (description.includes('audio') || description.includes('visual') || description.includes('av') || description.includes('sound') || description.includes('lighting')) {
                category = 'Technology';
              } else if (description.includes('marketing') || description.includes('promotion') || description.includes('advertising')) {
                category = 'Marketing';
              } else if (description.includes('staff') || description.includes('personnel') || description.includes('coordination')) {
                category = 'Staff';
              } else if (description.includes('photography') || description.includes('videography') || description.includes('media')) {
                category = 'Media';
              } else if (description.includes('security') || description.includes('safety')) {
                category = 'Security';
              } else if (description.includes('transport') || description.includes('logistics')) {
                category = 'Logistics';
              }
              
              // Validate amount is reasonable (not exceeding 1 billion per item)
              if (item.amount > 1000000000) {
                console.warn(`Budget item "${item.description}" has unusually large amount: ${item.amount}. Skipping.`);
                continue;
              }
              
              dto.budgetItems.push({
                category: category,
                description: item.description,
                estimatedAmount: String(item.amount),
                quantity: 1,
              });
            }
          }
        }
      } catch (error: unknown) {
        // The AI service is optional, so we don't rethrow the error.
        // The logger in the AiService will have already logged the failure.
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`AI parsing failed (non-fatal): ${errorMessage}`);
      }
    }
    
    console.log('Final DTO before service - expectedAudience:', dto.expectedAudience, 'venueId:', dto.venueId);
    
    // Create event with parsed data (rooms and sessions will be created after event)
    const event = await this.events.create(dto, parsedData, organizerId);
    
    return event;
  }

  @Post(':eventId/budget/items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new budget item for an event' })
  @ApiResponse({ status: 201, description: 'Budget item created successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the event organizer.' })
  async createBudgetItem(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() dto: CreateBudgetItemDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.events.createBudgetItem(eventId, dto, organizerId);
  }

  @Patch(':eventId/budget/items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing budget item' })
  @ApiResponse({ status: 200, description: 'Budget item updated successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Budget item not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the event organizer.' })
  async updateBudgetItem(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateBudgetItemDto,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    return this.events.updateBudgetItem(eventId, itemId, dto, organizerId);
  }

  @Delete(':eventId/budget/items/:itemId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a budget item' })
  @ApiResponse({ status: 200, description: 'Budget item deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Budget item not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the event organizer.' })
  async deleteBudgetItem(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Request() req: any,
  ) {
    const organizerId = req.user.userId;
    await this.events.deleteBudgetItem(eventId, itemId, organizerId);
    return { message: 'Budget item deleted successfully' };
  }
}
