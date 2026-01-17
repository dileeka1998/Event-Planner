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

  async getMyRegistrations(userId: number) {
    this.logger.log(`Fetching all registrations for user ${userId}`);
    
    // Get all user registrations (including CANCELLED for complete history)
    const allRegistrations = await this.attendeeRepo.find({
      where: { userId },
      relations: ['event', 'event.venue', 'user'],
      order: { joinedAt: 'DESC' },
    });

    // Format response with event data
    return allRegistrations.map(reg => ({
      id: reg.id,
      eventId: reg.eventId,
      userId: reg.userId,
      status: reg.status,
      joinedAt: reg.joinedAt,
      event: {
        id: reg.event.id,
        title: reg.event.title,
        startDate: reg.event.startDate,
        endDate: reg.event.endDate,
        expectedAudience: reg.event.expectedAudience,
        venue: reg.event.venue ? {
          id: reg.event.venue.id,
          name: reg.event.venue.name,
          capacity: reg.event.venue.capacity,
        } : null,
      },
      user: reg.user ? {
        id: reg.user.id,
        name: reg.user.name,
        email: reg.user.email,
      } : null,
    }));
  }

  async getDashboardData(userId: number) {
    this.logger.log(`Fetching dashboard data for user ${userId}`);
    
    // Get all user registrations (excluding CANCELLED)
    const allRegistrations = await this.attendeeRepo.find({
      where: [
        { userId, status: AttendeeStatus.CONFIRMED },
        { userId, status: AttendeeStatus.WAITLISTED },
      ],
      relations: ['event', 'event.venue'],
      order: { joinedAt: 'DESC' },
    });

    // Calculate statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const waitlistedCount = allRegistrations.filter(reg => reg.status === AttendeeStatus.WAITLISTED).length;

    const upcomingEvents = allRegistrations
      .filter(reg => {
        const eventStart = new Date(reg.event.startDate);
        eventStart.setHours(0, 0, 0, 0);
        return eventStart >= today;
      })
      .map(reg => reg.event)
      .filter((event, index, self) => self.findIndex(e => e.id === event.id) === index) // Remove duplicates
      .sort((a, b) => {
        const dateA = new Date(a.startDate).getTime();
        const dateB = new Date(b.startDate).getTime();
        return dateA - dateB; // ASC - soonest first
      })
      .slice(0, 3); // Next 3 events

    // Get next event (soonest upcoming)
    const nextEvent = upcomingEvents.length > 0 ? {
      id: upcomingEvents[0].id,
      title: upcomingEvents[0].title,
      startDate: upcomingEvents[0].startDate,
      venue: upcomingEvents[0].venue ? {
        id: upcomingEvents[0].venue.id,
        name: upcomingEvents[0].venue.name,
      } : null,
    } : undefined;

    // Get today's sessions from registered events
    const registeredEventIds = allRegistrations.map(reg => reg.eventId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let todaysSessions: Session[] = [];
    // Only query if user has registered events (avoid SQL error with empty IN clause)
    if (registeredEventIds.length > 0) {
      todaysSessions = await this.sessionRepo
        .createQueryBuilder('session')
        .leftJoinAndSelect('session.event', 'event')
        .leftJoinAndSelect('session.room', 'room')
        .where('session.eventId IN (:...eventIds)', { eventIds: registeredEventIds })
        .andWhere('session.startTime >= :todayStart', { todayStart })
        .andWhere('session.startTime <= :todayEnd', { todayEnd })
        .orderBy('session.startTime', 'ASC')
        .getMany();
    }

    // Format sessions for response
    const formattedSessions = todaysSessions.map(session => ({
      id: session.id,
      title: session.title,
      speaker: session.speaker,
      durationMin: session.durationMin,
      startTime: session.startTime,
      topic: session.topic,
      capacity: session.capacity,
      event: {
        id: session.event.id,
        title: session.event.title,
        startDate: session.event.startDate,
        endDate: session.event.endDate,
      },
      room: session.room ? {
        id: session.room.id,
        name: session.room.name,
        capacity: session.room.capacity,
      } : null,
    }));

    // Get recent registrations (last 5)
    const recentRegistrations = allRegistrations
      .sort((a, b) => {
        const dateA = new Date(a.joinedAt).getTime();
        const dateB = new Date(b.joinedAt).getTime();
        return dateB - dateA; // DESC - most recent first
      })
      .slice(0, 5)
      .map(reg => ({
        id: reg.id,
        eventId: reg.eventId,
        userId: reg.userId,
        status: reg.status,
        joinedAt: reg.joinedAt,
        event: {
          id: reg.event.id,
          title: reg.event.title,
          startDate: reg.event.startDate,
          endDate: reg.event.endDate,
          venue: reg.event.venue ? {
            id: reg.event.venue.id,
            name: reg.event.venue.name,
          } : null,
        },
      }));

    // Format upcoming events for response
    const formattedUpcomingEvents = upcomingEvents.map(event => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      expectedAudience: event.expectedAudience,
      venue: event.venue ? {
        id: event.venue.id,
        name: event.venue.name,
        capacity: event.venue.capacity,
      } : null,
    }));

    // Calculate statistics
    const statistics = {
      totalRegistered: allRegistrations.length,
      upcomingCount: upcomingEvents.length,
      waitlistedCount,
      nextEvent,
    };

    this.logger.log(`Dashboard data for user ${userId}: ${statistics.totalRegistered} total registrations, ${statistics.upcomingCount} upcoming, ${formattedSessions.length} sessions today`);

    return {
      statistics,
      upcomingEvents: formattedUpcomingEvents,
      todaysSessions: formattedSessions,
      recentRegistrations,
    };
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
    filters?: { topic?: string; day?: string; track?: string; showAll?: boolean }
  ) {
    this.logger.log(`Fetching recommended sessions for user ${userId} with filters: ${JSON.stringify(filters)}`);

    // Get user's event registrations
    const userRegistrations = await this.attendeeRepo.find({
      where: [
        { userId, status: AttendeeStatus.CONFIRMED },
        { userId, status: AttendeeStatus.WAITLISTED },
      ],
    });

    const registeredEventIds = userRegistrations.map(reg => reg.eventId);
    const registrationMap = new Map<number, AttendeeStatus>();
    userRegistrations.forEach(reg => {
      registrationMap.set(reg.eventId, reg.status);
    });

    this.logger.log(`User ${userId} is registered for ${registeredEventIds.length} events`);

    // Fetch all sessions with relations
    const allSessions = await this.sessionRepo.find({
      relations: ['event', 'event.organizer', 'room'],
    });

    this.logger.log(`Found ${allSessions.length} total sessions in database`);

    if (allSessions.length === 0) {
      this.logger.warn('No sessions found in database. Returning empty array.');
      return [];
    }

    // Filter by registered events if showAll is false (default)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sessionsToProcess = allSessions;
    if (!filters?.showAll) {
      // Only show sessions from registered events
      if (registeredEventIds.length > 0) {
        sessionsToProcess = allSessions.filter(s => registeredEventIds.includes(s.event.id));
      } else {
        // No registered events, return empty array
        this.logger.log('User has no registered events and showAll is false. Returning empty array.');
        return [];
      }
    }

    // Filter out sessions from events that have started
    sessionsToProcess = sessionsToProcess.filter(s => {
      const eventStart = new Date(s.event.startDate);
      eventStart.setHours(0, 0, 0, 0);
      return eventStart >= today;
    });

    // Process sessions with topic and day information
    const processedSessions = sessionsToProcess.map((session) => {
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

    // Format response with registration status
    return filteredSessions.map((session) => {
      const eventId = session.event.id;
      const isEventRegistered = registrationMap.has(eventId);
      const eventRegistrationStatus = registrationMap.get(eventId) || null;

      return {
        id: session.id,
        title: session.title,
        speaker: session.speaker,
        durationMin: session.durationMin,
        startTime: session.startTime,
        topic: session.topic,
        dayNumber: session.dayNumber,
        dayOfWeek: session.dayOfWeek,
        capacity: session.capacity,
        eventId: eventId,
        isEventRegistered: isEventRegistered,
        eventRegistrationStatus: eventRegistrationStatus,
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
      };
    });
  }

  async getMySessions(userId: number) {
    this.logger.log(`Fetching sessions for user ${userId} from registered events`);

    // Get user's event registrations (excluding CANCELLED)
    const userRegistrations = await this.attendeeRepo.find({
      where: [
        { userId, status: AttendeeStatus.CONFIRMED },
        { userId, status: AttendeeStatus.WAITLISTED },
      ],
    });

    if (userRegistrations.length === 0) {
      this.logger.log(`User ${userId} has no registered events. Returning empty array.`);
      return [];
    }

    const registeredEventIds = userRegistrations.map(reg => reg.eventId);

    // Get all sessions from registered events
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sessions = await this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.event', 'event')
      .leftJoinAndSelect('session.room', 'room')
      .where('session.eventId IN (:...eventIds)', { eventIds: registeredEventIds })
      .andWhere('DATE(event.startDate) >= :today', { today: today.toISOString().split('T')[0] })
      .orderBy('session.startTime', 'ASC')
      .getMany();

    this.logger.log(`Found ${sessions.length} sessions from ${registeredEventIds.length} registered events`);

    // Format response
    return sessions.map(session => ({
      id: session.id,
      title: session.title,
      speaker: session.speaker,
      durationMin: session.durationMin,
      startTime: session.startTime,
      topic: session.topic,
      capacity: session.capacity,
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

  async getAvailableEvents(userId: number) {
    this.logger.log(`Fetching available events for user ${userId}`);

    // Get user's event registrations
    const userRegistrations = await this.attendeeRepo.find({
      where: [
        { userId, status: AttendeeStatus.CONFIRMED },
        { userId, status: AttendeeStatus.WAITLISTED },
      ],
    });

    const registeredEventIds = userRegistrations.map(reg => reg.eventId);

    // Get all events that haven't started
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents = await this.eventRepo.find({
      relations: ['venue', 'organizer', 'attendees'],
      order: { startDate: 'ASC' },
    });

    // Filter: exclude registered events and past events
    const availableEvents = allEvents.filter(event => {
      const eventStart = new Date(event.startDate);
      eventStart.setHours(0, 0, 0, 0);
      return !registeredEventIds.includes(event.id) && eventStart >= today;
    });

    this.logger.log(`Found ${availableEvents.length} available events for user ${userId}`);

    // Format response with capacity info
    return availableEvents.map(event => {
      const confirmedCount = event.attendees?.filter(a => a.status === AttendeeStatus.CONFIRMED).length || 0;
      const capacity = event.venue?.capacity || event.expectedAudience || 0;
      const availableSpots = capacity > 0 ? Math.max(0, capacity - confirmedCount) : null;

      return {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        expectedAudience: event.expectedAudience,
        venue: event.venue ? {
          id: event.venue.id,
          name: event.venue.name,
          capacity: event.venue.capacity,
        } : null,
        organizer: {
          id: event.organizer.id,
          name: event.organizer.name,
          email: event.organizer.email,
        },
        capacity: capacity,
        confirmedCount: confirmedCount,
        availableSpots: availableSpots,
        isFull: capacity > 0 && confirmedCount >= capacity,
      };
    });
  }
}

