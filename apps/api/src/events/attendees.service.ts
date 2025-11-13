import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventAttendee, AttendeeStatus } from './event-attendee.entity';
import { Event } from './event.entity';
import { User } from '@users/user.entity';

@Injectable()
export class AttendeesService {
  private readonly logger = new Logger(AttendeesService.name);

  constructor(
    @InjectRepository(EventAttendee) private attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  async register(eventId: number, userId: number) {
    this.logger.log(`Registering user ${userId} for event ${eventId}`);
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check if event exists
      const event = await this.eventRepo.findOne({
        where: { id: eventId },
        relations: ['venue', 'attendees'],
      });
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Check if user exists
      const user = await this.userRepo.findOneBy({ id: userId });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Check if already registered
      const existing = await this.attendeeRepo.findOne({
        where: { eventId, userId },
      });
      if (existing) {
        if (existing.status === AttendeeStatus.CANCELLED) {
          // Re-activate cancelled registration
          existing.status = AttendeeStatus.CONFIRMED;
          await queryRunner.manager.save(EventAttendee, existing);
          await queryRunner.commitTransaction();
          return existing;
        }
        throw new ConflictException('User is already registered for this event');
      }

      // Check capacity
      const confirmedCount = await this.attendeeRepo.count({
        where: { eventId, status: AttendeeStatus.CONFIRMED },
      });
      const capacity = event.venue?.capacity || event.expectedAudience || 0;
      const status = confirmedCount < capacity ? AttendeeStatus.CONFIRMED : AttendeeStatus.WAITLISTED;

      const attendee = this.attendeeRepo.create({
        eventId,
        userId,
        event,
        user,
        status,
      });

      const saved = await queryRunner.manager.save(EventAttendee, attendee);
      await queryRunner.commitTransaction();

      // Reload with relations
      const attendeeWithRelations = await this.attendeeRepo.findOne({
        where: { id: saved.id },
        relations: ['event', 'user'],
      });

      this.logger.log(`User ${userId} registered for event ${eventId} with status ${status}`);
      return attendeeWithRelations;
    } catch (error: unknown) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error registering attendee: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async leave(eventId: number, userId: number) {
    this.logger.log(`Removing user ${userId} from event ${eventId}`);
    const attendee = await this.attendeeRepo.findOne({
      where: { eventId, userId },
    });

    if (!attendee) {
      throw new NotFoundException('Registration not found');
    }

    // Mark as cancelled instead of deleting
    attendee.status = AttendeeStatus.CANCELLED;
    await this.attendeeRepo.save(attendee);

    // Promote first waitlisted attendee if any
    const waitlisted = await this.attendeeRepo.findOne({
      where: { eventId, status: AttendeeStatus.WAITLISTED },
      order: { joinedAt: 'ASC' },
    });

    if (waitlisted) {
      waitlisted.status = AttendeeStatus.CONFIRMED;
      await this.attendeeRepo.save(waitlisted);
      this.logger.log(`Promoted waitlisted attendee ${waitlisted.userId} to confirmed`);
    }

    return { message: 'Successfully left the event' };
  }

  async getEventAttendees(eventId: number) {
    this.logger.log(`Fetching attendees for event ${eventId}`);
    const event = await this.eventRepo.findOneBy({ id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return this.attendeeRepo.find({
      where: { eventId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }
}

