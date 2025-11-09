import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './event.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event) private repo: Repository<Event>,
    private users: UsersService,
  ) {}

  async create(dto: any) {
    this.logger.log(`Creating event with title: ${dto.title}`);
    try {
      const organizer = await this.users.findById(dto.organizerId);
      if (!organizer) {
        this.logger.warn(`Event creation failed: Organizer not found with ID: ${dto.organizerId}`);
        throw new BadRequestException('Organizer not found');
      }
      const ev = this.repo.create({ ...dto, organizer });
      const savedEvent = await this.repo.save(ev);
      // repo.save() can return Event or Event[], but we're saving a single entity
      const event = Array.isArray(savedEvent) ? savedEvent[0] : savedEvent;
      this.logger.log(`Event created successfully with ID: ${event.id}`);
      return event;
    } catch (error: any) {
      this.logger.error(`Error creating event: ${error?.message || String(error)}`, error?.stack);
      throw error;
    }
  }

  findAll() {
    this.logger.log('Fetching all events');
    return this.repo.find({ relations: ['rooms', 'sessions'] });
  }
}
