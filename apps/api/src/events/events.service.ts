import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Event } from './event.entity';
import { EventBudget } from './event-budget.entity';
import { BudgetItem, BudgetItemStatus } from './budget-item.entity';
import { Venue } from './venue.entity';
import { UsersService } from '../users/users.service';
import { VenuesService } from '../venues/venues.service';
import { CreateEventDto, BudgetItemDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(EventBudget) private budgetRepo: Repository<EventBudget>,
    @InjectRepository(BudgetItem) private budgetItemRepo: Repository<BudgetItem>,
    private users: UsersService,
    private venues: VenuesService,
    private dataSource: DataSource,
  ) {}

  async create(dto: CreateEventDto) {
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
      
      // If no budget items provided and we have a budget, generate heuristic items
      if (budgetItems.length === 0 && dto.budget) {
        const totalBudget = parseFloat(dto.budget);
        budgetItems = this.generateHeuristicBudgetItems(totalBudget);
      }

      // Calculate total estimated
      const totalEstimated = budgetItems.reduce(
        (sum, item) => sum + parseFloat(item.estimatedAmount || '0') * (item.quantity || 1),
        0,
      ).toFixed(2);

      // Create event budget
      const eventBudget = this.budgetRepo.create({
        event: savedEvent,
        totalEstimated: totalEstimated,
        totalActual: '0',
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

      // Reload event with all relations
      const eventWithRelations = await this.eventRepo.findOne({
        where: { id: savedEvent.id },
        relations: ['organizer', 'venue', 'eventBudget', 'eventBudget.items', 'attendees', 'attendees.user'],
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

  private generateHeuristicBudgetItems(totalBudget: number): BudgetItemDto[] {
    // Heuristic split: venue 40%, catering 30%, AV 10%, misc 20%
    const venueAmount = (totalBudget * 0.4).toFixed(2);
    const cateringAmount = (totalBudget * 0.3).toFixed(2);
    const avAmount = (totalBudget * 0.1).toFixed(2);
    const miscAmount = (totalBudget * 0.2).toFixed(2);

    return [
      {
        category: 'Venue',
        description: 'Venue rental and facilities',
        estimatedAmount: venueAmount,
        quantity: 1,
      },
      {
        category: 'Catering',
        description: 'Food and beverages',
        estimatedAmount: cateringAmount,
        quantity: 1,
      },
      {
        category: 'Audio/Visual',
        description: 'AV equipment and technical support',
        estimatedAmount: avAmount,
        quantity: 1,
      },
      {
        category: 'Miscellaneous',
        description: 'Other expenses',
        estimatedAmount: miscAmount,
        quantity: 1,
      },
    ];
  }

  findAll() {
    this.logger.log('Fetching all events');
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
}
