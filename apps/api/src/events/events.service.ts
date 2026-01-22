import { Injectable, BadRequestException, NotFoundException, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Event } from './event.entity';
import { EventBudget } from './event-budget.entity';
import { BudgetItem, BudgetItemStatus } from './budget-item.entity';
import { Venue } from './venue.entity';
import { Room } from '../rooms/room.entity';
import { Session } from './session.entity';
import { UsersService } from '../users/users.service';
import { VenuesService } from '../venues/venues.service';
import { SessionsService } from './sessions.service';
import { CreateEventDto, BudgetItemDto } from './dto/create-event.dto';
import { CreateBudgetItemDto } from './dto/create-budget-item.dto';
import { UpdateBudgetItemDto } from './dto/update-budget-item.dto';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(EventBudget) private budgetRepo: Repository<EventBudget>,
    @InjectRepository(BudgetItem) private budgetItemRepo: Repository<BudgetItem>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    private users: UsersService,
    private venues: VenuesService,
    private sessionsService: SessionsService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateEventDto, parsedData?: any, organizerId?: number) {
    this.logger.log(`Creating event with title: ${dto.title}`);
    this.logger.log(`Received venueId: ${dto.venueId}, expectedAudience: ${dto.expectedAudience}`);
    
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Validate organizer
      const organizer = await this.users.findById(dto.organizerId);
      if (!organizer) {
        this.logger.warn(`Event creation failed: Organizer not found with ID: ${dto.organizerId}`);
        throw new BadRequestException('Organizer not found');
      }

      // Validate venue - REQUIRED
      if (dto.venueId === undefined || dto.venueId === null || dto.venueId === 0) {
        this.logger.warn('Event creation failed: No venue provided');
        throw new BadRequestException('A venue is required to create an event. Please select a venue.');
      }

      const venue = await this.venues.findOne(dto.venueId);
      if (!venue) {
        this.logger.warn(`Event creation failed: Venue with ID ${dto.venueId} not found`);
        throw new BadRequestException(`Venue with ID ${dto.venueId} not found`);
      }

      // Verify venue belongs to the organizer
      if (venue.organizer.id !== dto.organizerId) {
        this.logger.warn(`Event creation failed: Venue ${venue.id} does not belong to organizer ${dto.organizerId}`);
        throw new BadRequestException(`Venue "${venue.name}" does not belong to you. Please select a venue you created.`);
      }

      this.logger.log(`Venue found: ${venue.name} (capacity: ${venue.capacity})`);
      this.logger.log(`Expected audience: ${dto.expectedAudience}`);

      // Validate capacity - REQUIRED if expectedAudience is provided
      if (dto.expectedAudience !== undefined && dto.expectedAudience !== null) {
        if (dto.expectedAudience > venue.capacity) {
          this.logger.warn(
            `Event creation failed: Expected audience (${dto.expectedAudience}) exceeds venue capacity (${venue.capacity})`
          );
          throw new BadRequestException(
            `Expected audience (${dto.expectedAudience}) exceeds venue capacity (${venue.capacity}). Please select a larger venue or reduce the expected audience.`
          );
        }
      } else {
        this.logger.warn('Event creation: expectedAudience not provided, skipping capacity validation');
      }

      // Check for date conflicts
      const conflicts = await this.checkVenueAvailability(
        dto.venueId,
        dto.startDate,
        dto.endDate,
        null // No existing event ID for new events
      );

      if (conflicts.length > 0) {
        const conflictDates = conflicts.map(c => c.startDate).join(', ');
        this.logger.warn(
          `Event creation failed: Venue ${venue.name} is already booked on ${conflictDates}`
        );
        throw new BadRequestException(
          `Venue "${venue.name}" is already booked for the selected dates. Conflicting dates: ${conflictDates}`
        );
      }

      // Create event
      const event = this.eventRepo.create({
        organizer,
        title: dto.title,
        startDate: dto.startDate,
        endDate: dto.endDate,
        expectedAudience: dto.expectedAudience ?? 0,
        budget: dto.budget ?? '0',
        venue,
      });
      const savedEvent = await queryRunner.manager.save(Event, event);

      // Create budget and items
      let budgetItems: BudgetItemDto[] = dto.budgetItems || [];

      // Calculate total estimated with proper validation
      let totalEstimated = '0.00';
      if (budgetItems.length > 0) {
        const total = budgetItems.reduce(
          (sum, item) => {
            const amount = parseFloat(item.estimatedAmount || '0');
            const quantity = item.quantity || 1;
            const itemTotal = amount * quantity;
            
            // Validate the value is finite and not NaN
            if (!isFinite(itemTotal) || isNaN(itemTotal)) {
              this.logger.warn(`Invalid budget item amount: ${item.estimatedAmount}, quantity: ${quantity}`);
              return sum;
            }
            
            return sum + itemTotal;
          },
          0,
        );
        
        // Validate total is within decimal(12,2) range (max: 9999999999.99)
        const maxValue = 9999999999.99;
        if (total > maxValue) {
          this.logger.error(`Total estimated budget (${total}) exceeds maximum allowed value (${maxValue})`);
          throw new BadRequestException(
            `Total estimated budget exceeds maximum allowed value. Please reduce individual budget items.`
          );
        }
        
        totalEstimated = total.toFixed(2);
      }

      // Create event budget
      const eventBudget = this.budgetRepo.create({
        event: savedEvent,
        totalEstimated: totalEstimated,
        totalActual: '0.00',
      });
      const savedBudget = await queryRunner.manager.save(EventBudget, eventBudget);

      // Create budget items
      if (budgetItems.length > 0) {
        const items = budgetItems.map((item) =>
          this.budgetItemRepo.create({
            eventBudget: savedBudget,
            category: item.category,
            description: item.description,
            estimatedAmount: item.estimatedAmount,
            actualAmount: item.actualAmount || '0',
            quantity: item.quantity || 1,
            unit: item.unit,
            vendor: item.vendor,
            status: BudgetItemStatus.PLANNED,
          }),
        );
        await queryRunner.manager.save(BudgetItem, items);
      }

      await queryRunner.commitTransaction();

      // After event creation, handle parsed data (rooms and sessions)
      if (parsedData && organizerId) {
        try {
          // Create rooms if provided
          let roomMap = new Map<string, Room>();
          if (parsedData.rooms && parsedData.rooms.length > 0) {
            roomMap = await this.findOrCreateRooms(
              savedEvent.id,
              organizerId,
              parsedData.rooms
            );
          }
          
          // Create sessions if provided
          if (parsedData.sessions && parsedData.sessions.length > 0) {
            await this.createSessionsFromParsed(
              savedEvent.id,
              organizerId,
              parsedData.sessions,
              roomMap
            );
          }
        } catch (error) {
          this.logger.error(`Error creating rooms/sessions from parsed data: ${error}`);
          // Don't fail event creation if rooms/sessions creation fails
        }
      }

      // Reload event with all relations
      const eventWithRelations = await this.eventRepo.findOne({
        where: { id: savedEvent.id },
        relations: ['organizer', 'venue', 'eventBudget', 'eventBudget.items', 'attendees', 'attendees.user', 'rooms', 'sessions'],
      });

      this.logger.log(`Event created successfully with ID: ${savedEvent.id}`);
      return eventWithRelations;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error creating event: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll(organizerId?: number) {
    if (organizerId) {
      this.logger.log(`Fetching events for organizer ${organizerId}`);
      return this.eventRepo.find({
        where: { organizer: { id: organizerId } },
        relations: ['organizer', 'venue', 'eventBudget', 'eventBudget.items', 'attendees', 'attendees.user', 'rooms', 'sessions'],
      });
    }
    this.logger.log('Fetching all events (no organizer filter)');
    return this.eventRepo.find({
      relations: ['organizer', 'venue', 'eventBudget', 'eventBudget.items', 'attendees', 'attendees.user', 'rooms', 'sessions'],
    });
  }

  async findOne(id: number) {
    this.logger.log(`Fetching event with ID: ${id}`);
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['organizer', 'venue', 'eventBudget', 'eventBudget.items', 'attendees', 'attendees.user', 'rooms', 'sessions'],
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  private async checkVenueAvailability(
  venueId: number,
  startDate: string,
  endDate: string,
  excludeEventId: number | null = null
): Promise<Event[]> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Build query to find overlapping events
  const query = this.eventRepo
    .createQueryBuilder('event')
    .where('event.venueId = :venueId', { venueId })
    .andWhere(
      // Events that overlap: startDate <= end AND endDate >= start
      '(event.startDate <= :end AND event.endDate >= :start)',
      { start: startDate, end: endDate }
    );

  // Exclude current event if updating
  if (excludeEventId) {
    query.andWhere('event.id != :excludeEventId', { excludeEventId });
  }

  return await query.getMany();
}

  async createBudgetItem(eventId: number, dto: CreateBudgetItemDto, organizerId: number) {
    this.logger.log(`Creating budget item for event ${eventId}`);
    
    // Verify event exists and belongs to organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'eventBudget'],
    });
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    
    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only manage budget items for your own events');
    }
    
    // Get or create event budget
    let eventBudget = event.eventBudget;
    if (!eventBudget) {
      this.logger.log(`Creating new event budget for event ${eventId}`);
      eventBudget = this.budgetRepo.create({
        event: event,
        totalEstimated: '0.00',
        totalActual: '0.00',
      });
      eventBudget = await this.budgetRepo.save(eventBudget);
    }
    
    // Create budget item
    const status: BudgetItemStatus = dto.status ? (dto.status as BudgetItemStatus) : BudgetItemStatus.PLANNED;
    const budgetItem = this.budgetItemRepo.create({
      eventBudget: eventBudget,
      category: dto.category,
      description: dto.description,
      estimatedAmount: dto.estimatedAmount,
      actualAmount: dto.actualAmount || '0.00',
      quantity: dto.quantity || 1,
      unit: dto.unit,
      vendor: dto.vendor,
      status: status,
    });
    
    const savedItem = await this.budgetItemRepo.save(budgetItem);
    
    // Recalculate budget totals
    await this.recalculateBudgetTotals(eventBudget.id);
    
    this.logger.log(`Budget item created with ID: ${savedItem.id}`);
    return savedItem;
  }

  async updateBudgetItem(eventId: number, itemId: number, dto: UpdateBudgetItemDto, organizerId: number) {
    this.logger.log(`Updating budget item ${itemId} for event ${eventId}`);
    
    // Verify event exists and belongs to organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    
    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only manage budget items for your own events');
    }
    
    // Find budget item
    const budgetItem = await this.budgetItemRepo.findOne({
      where: { id: itemId },
      relations: ['eventBudget', 'eventBudget.event'],
    });
    
    if (!budgetItem) {
      throw new NotFoundException(`Budget item with ID ${itemId} not found`);
    }
    
    // Verify item belongs to the event
    if (budgetItem.eventBudget.event.id !== eventId) {
      throw new BadRequestException('Budget item does not belong to this event');
    }
    
    // Update fields
    if (dto.category !== undefined) budgetItem.category = dto.category;
    if (dto.description !== undefined) budgetItem.description = dto.description;
    if (dto.estimatedAmount !== undefined) budgetItem.estimatedAmount = dto.estimatedAmount;
    if (dto.actualAmount !== undefined) budgetItem.actualAmount = dto.actualAmount;
    if (dto.quantity !== undefined) budgetItem.quantity = dto.quantity;
    if (dto.unit !== undefined) budgetItem.unit = dto.unit;
    if (dto.vendor !== undefined) budgetItem.vendor = dto.vendor;
    if (dto.status !== undefined) budgetItem.status = dto.status as BudgetItemStatus;
    
    const updatedItem = await this.budgetItemRepo.save(budgetItem);
    
    // Recalculate budget totals
    await this.recalculateBudgetTotals(budgetItem.eventBudget.id);
    
    this.logger.log(`Budget item ${itemId} updated successfully`);
    return updatedItem;
  }

  async deleteBudgetItem(eventId: number, itemId: number, organizerId: number) {
    this.logger.log(`Deleting budget item ${itemId} for event ${eventId}`);
    
    // Verify event exists and belongs to organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }
    
    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only manage budget items for your own events');
    }
    
    // Find budget item
    const budgetItem = await this.budgetItemRepo.findOne({
      where: { id: itemId },
      relations: ['eventBudget', 'eventBudget.event'],
    });
    
    if (!budgetItem) {
      throw new NotFoundException(`Budget item with ID ${itemId} not found`);
    }
    
    // Verify item belongs to the event
    if (budgetItem.eventBudget.event.id !== eventId) {
      throw new BadRequestException('Budget item does not belong to this event');
    }
    
    const eventBudgetId = budgetItem.eventBudget.id;
    
    // Delete the item
    await this.budgetItemRepo.remove(budgetItem);
    
    // Recalculate budget totals
    await this.recalculateBudgetTotals(eventBudgetId);
    
    this.logger.log(`Budget item ${itemId} deleted successfully`);
  }

  private async recalculateBudgetTotals(eventBudgetId: number) {
    this.logger.log(`Recalculating budget totals for budget ${eventBudgetId}`);
    
    const eventBudget = await this.budgetRepo.findOne({
      where: { id: eventBudgetId },
      relations: ['items'],
    });
    
    if (!eventBudget) {
      this.logger.warn(`Event budget ${eventBudgetId} not found for recalculation`);
      return;
    }
    
    // Calculate totals from all items with validation
    const totalEstimated = eventBudget.items.reduce(
      (sum, item) => {
        const amount = parseFloat(item.estimatedAmount || '0');
        const quantity = item.quantity || 1;
        const itemTotal = amount * quantity;
        
        if (!isFinite(itemTotal) || isNaN(itemTotal)) {
          this.logger.warn(`Invalid budget item amount: ${item.estimatedAmount}, quantity: ${quantity}`);
          return sum;
        }
        
        return sum + itemTotal;
      },
      0,
    );
    
    const totalActual = eventBudget.items.reduce(
      (sum, item) => {
        const amount = parseFloat(item.actualAmount || '0');
        
        if (!isFinite(amount) || isNaN(amount)) {
          this.logger.warn(`Invalid actual amount: ${item.actualAmount}`);
          return sum;
        }
        
        return sum + amount;
      },
      0,
    );
    
    // Validate totals are within decimal(12,2) range
    const maxValue = 9999999999.99;
    if (totalEstimated > maxValue) {
      this.logger.error(`Total estimated budget (${totalEstimated}) exceeds maximum allowed value (${maxValue})`);
      throw new BadRequestException(
        `Total estimated budget exceeds maximum allowed value. Please reduce individual budget items.`
      );
    }
    
    if (totalActual > maxValue) {
      this.logger.error(`Total actual budget (${totalActual}) exceeds maximum allowed value (${maxValue})`);
      throw new BadRequestException(
        `Total actual budget exceeds maximum allowed value. Please reduce individual budget items.`
      );
    }
    
    eventBudget.totalEstimated = totalEstimated.toFixed(2);
    eventBudget.totalActual = totalActual.toFixed(2);
    
    await this.budgetRepo.save(eventBudget);
    
    this.logger.log(`Budget totals recalculated: Estimated=${totalEstimated}, Actual=${totalActual}`);
  }

  /**
   * Find or create a venue by name (case-insensitive matching).
   * If venue doesn't exist, creates it with the provided details.
   */
  async findOrCreateVenue(
    venueName: string,
    organizerId: number,
    capacity?: number,
    address?: string
  ): Promise<Venue> {
    this.logger.log(`Finding or creating venue: ${venueName} for organizer ${organizerId}`);
    
    // Find existing venues for this organizer
    const existingVenues = await this.venues.findAll(organizerId);
    
    // Case-insensitive search
    const normalizedSearchName = venueName.toLowerCase().trim();
    const existingVenue = existingVenues.find(
      v => v.name.toLowerCase().trim() === normalizedSearchName
    );
    
    if (existingVenue) {
      this.logger.log(`Found existing venue: ${existingVenue.name} (ID: ${existingVenue.id})`);
      return existingVenue;
    }
    
    // Create new venue
    this.logger.log(`Creating new venue: ${venueName}`);
    const newVenue = await this.venues.create({
      name: venueName,
      address: address || venueName, // Use venue name as address if not provided
      capacity: capacity || 100, // Default capacity
    }, organizerId);
    
    this.logger.log(`Created new venue: ${newVenue.name} (ID: ${newVenue.id})`);
    return newVenue;
  }

  /**
   * Find or create rooms for an event (case-insensitive matching).
   * Returns a map of room names to Room entities.
   */
  async findOrCreateRooms(
    eventId: number,
    organizerId: number,
    roomData: Array<{ name: string; capacity: number }>
  ): Promise<Map<string, Room>> {
    this.logger.log(`Finding or creating ${roomData.length} rooms for event ${eventId}`);
    
    // Get existing rooms for this event
    const existingRooms = await this.roomRepo.find({
      where: { event: { id: eventId } },
    });
    
    const roomMap = new Map<string, Room>();
    const normalizedExistingRooms = new Map<string, Room>();
    
    // Create normalized map of existing rooms
    for (const room of existingRooms) {
      const normalizedName = room.name.toLowerCase().trim();
      normalizedExistingRooms.set(normalizedName, room);
    }
    
    // Find or create each room
    for (const roomInfo of roomData) {
      const normalizedName = roomInfo.name.toLowerCase().trim();
      const existingRoom = normalizedExistingRooms.get(normalizedName);
      
      if (existingRoom) {
        this.logger.log(`Found existing room: ${existingRoom.name} (ID: ${existingRoom.id})`);
        roomMap.set(roomInfo.name, existingRoom);
      } else {
        // Create new room
        const event = await this.eventRepo.findOne({ where: { id: eventId } });
        if (!event) {
          throw new NotFoundException(`Event with ID ${eventId} not found`);
        }
        
        const newRoom = this.roomRepo.create({
          event,
          name: roomInfo.name,
          capacity: roomInfo.capacity,
        });
        
        const savedRoom = await this.roomRepo.save(newRoom);
        this.logger.log(`Created new room: ${savedRoom.name} (ID: ${savedRoom.id})`);
        roomMap.set(roomInfo.name, savedRoom);
      }
    }
    
    return roomMap;
  }

  /**
   * Create sessions from parsed session data after event and rooms are created.
   */
  async createSessionsFromParsed(
    eventId: number,
    organizerId: number,
    sessions: Array<{ title: string; speaker?: string; roomName?: string; durationMin: number }>,
    roomMap: Map<string, Room>
  ): Promise<Session[]> {
    this.logger.log(`Creating ${sessions.length} sessions for event ${eventId}`);
    
    const createdSessions: Session[] = [];
    
    for (const sessionData of sessions) {
      // Find room if specified
      let room: Room | null = null;
      if (sessionData.roomName) {
        room = roomMap.get(sessionData.roomName) || null;
        if (!room) {
          this.logger.warn(`Room "${sessionData.roomName}" not found for session "${sessionData.title}", creating without room`);
        }
      }
      
      // Create session DTO
      const sessionDto: CreateSessionDto = {
        title: sessionData.title,
        speaker: sessionData.speaker || undefined,
        durationMin: sessionData.durationMin || 60,
        topic: 'General', // Default topic
        capacity: 0, // Default capacity
        roomId: room?.id || undefined,
      };
      
      try {
        const createdSession = await this.sessionsService.create(eventId, sessionDto, organizerId);
        if (createdSession && createdSession.id) {
          createdSessions.push(createdSession);
          this.logger.log(`Created session: ${createdSession.title} (ID: ${createdSession.id})`);
        }
      } catch (error) {
        this.logger.error(`Failed to create session "${sessionData.title}": ${error}`);
        // Continue with other sessions
      }
    }
    
    return createdSessions;
  }
}
