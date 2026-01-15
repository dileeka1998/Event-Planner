import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventAttendee, AttendeeStatus } from './event-attendee.entity';
import { Event } from './event.entity';
import { Session } from './session.entity';
import { User } from '@users/user.entity';

@Injectable()
export class AttendeesService {
  private readonly logger = new Logger(AttendeesService.name);

  constructor(
    @InjectRepository(EventAttendee) private attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
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

  private extractTopicFromTitle(title: string): string {
    const titleLower = title.toLowerCase();
    const topicKeywords: { [key: string]: string } = {
      'ai': 'Technology',
      'artificial intelligence': 'Technology',
      'machine learning': 'Technology',
      'web': 'Development',
      'development': 'Development',
      'programming': 'Development',
      'data': 'Data',
      'data science': 'Data',
      'analytics': 'Data',
      'security': 'Security',
      'cybersecurity': 'Security',
      'design': 'Design',
      'ux': 'Design',
      'ui': 'Design',
      'cloud': 'Technology',
      'devops': 'Development',
      'mobile': 'Development',
      'blockchain': 'Technology',
    };

    for (const [keyword, topic] of Object.entries(topicKeywords)) {
      if (titleLower.includes(keyword)) {
        return topic;
      }
    }

    return 'General';
  }

  private calculateDayInfo(sessionStartTime: Date | null, eventStartDate: string): { dayNumber: string; dayOfWeek: string } | null {
    if (!sessionStartTime || !eventStartDate) {
      return null;
    }

    const eventStart = new Date(eventStartDate);
    eventStart.setHours(0, 0, 0, 0);
    const sessionStart = new Date(sessionStartTime);
    sessionStart.setHours(0, 0, 0, 0);

    const diffTime = sessionStart.getTime() - eventStart.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return null;
    }

    const dayNumber = `Day ${diffDays + 1}`;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[sessionStart.getDay()];

    return { dayNumber, dayOfWeek };
  }

  async getRecommendedSessions(
    userId: number,
    filters?: { topic?: string; day?: string; track?: string }
  ) {
    this.logger.log(`Fetching recommended sessions for user ${userId} with filters: ${JSON.stringify(filters)}`);

    // Fetch all sessions with relations
    const allSessions = await this.sessionRepo.find({
      relations: ['event', 'event.organizer', 'room'],
    });

    this.logger.log(`Found ${allSessions.length} total sessions in database`);

    if (allSessions.length === 0) {
      this.logger.warn('No sessions found in database. Returning empty array.');
      return [];
    }

    // Process sessions with topic and day information
    const processedSessions = allSessions.map((session) => {
      // Use stored topic if available, otherwise extract from title
      const topic = session.topic || this.extractTopicFromTitle(session.title);
      const dayInfo = this.calculateDayInfo(session.startTime, session.event.startDate);

      this.logger.debug(`Processing session ${session.id}: title="${session.title}", topic="${topic}", dayInfo=${JSON.stringify(dayInfo)}`);

      return {
        ...session,
        topic,
        dayNumber: dayInfo?.dayNumber || null,
        dayOfWeek: dayInfo?.dayOfWeek || null,
      };
    });

    // Apply filters
    let filteredSessions = processedSessions;
    this.logger.log(`Before filtering: ${filteredSessions.length} sessions`);

    if (filters?.topic) {
      const beforeCount = filteredSessions.length;
      filteredSessions = filteredSessions.filter(
        (s) => s.topic.toLowerCase() === filters.topic!.toLowerCase()
      );
      this.logger.log(`After topic filter "${filters.topic}": ${filteredSessions.length} sessions (was ${beforeCount})`);
    }

    if (filters?.day) {
      const beforeCount = filteredSessions.length;
      filteredSessions = filteredSessions.filter(
        (s) => s.dayNumber === filters.day || s.dayOfWeek === filters.day
      );
      this.logger.log(`After day filter "${filters.day}": ${filteredSessions.length} sessions (was ${beforeCount})`);
    }

    if (filters?.track) {
      const beforeCount = filteredSessions.length;
      filteredSessions = filteredSessions.filter(
        (s) => s.topic.toLowerCase() === filters.track!.toLowerCase()
      );
      this.logger.log(`After track filter "${filters.track}": ${filteredSessions.length} sessions (was ${beforeCount})`);
    }

    this.logger.log(`Returning ${filteredSessions.length} filtered sessions`);

    // Format response
    return filteredSessions.map((session) => ({
      id: session.id,
      title: session.title,
      speaker: session.speaker,
      durationMin: session.durationMin,
      startTime: session.startTime,
      topic: session.topic,
      dayNumber: session.dayNumber,
      dayOfWeek: session.dayOfWeek,
      event: {
        id: session.event.id,
        title: session.event.title,
        startDate: session.event.startDate,
        endDate: session.event.endDate,
        expectedAudience: session.event.expectedAudience,
      },
      room: session.room ? {
        id: session.room.id,
        name: session.room.name,
        capacity: session.room.capacity,
      } : null,
    }));
  }
}

