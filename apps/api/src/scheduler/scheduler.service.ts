import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Event } from '../events/event.entity';
import { Session } from '../events/session.entity';
import { Room } from '../rooms/room.entity';
import { AiService } from '../ai/ai.service';
import { UserRole } from '../users/user.entity';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    private aiService: AiService,
  ) {}

  async generateSchedule(eventId: number, organizerId: number, gapMinutes: number = 0, dryRun: boolean = false, startTime?: string) {
    this.logger.log(`Generating schedule for event ${eventId} by organizer ${organizerId} with gap time: ${gapMinutes} minutes (dryRun: ${dryRun})`);

    // Fetch event with relations
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'sessions', 'rooms'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Validate organizer
    if (event.organizer.id !== organizerId || event.organizer.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException(`User ${organizerId} is not the organizer of event ${eventId}`);
    }

    // Validate event has sessions and rooms
    if (!event.sessions || event.sessions.length === 0) {
      throw new BadRequestException('Event must have at least one session to generate a schedule');
    }

    if (!event.rooms || event.rooms.length === 0) {
      throw new BadRequestException('Event must have at least one room to generate a schedule');
    }

    // Prepare data for AI service
    const scheduleRequest = {
      eventId: event.id,
      startDate: event.startDate,
      endDate: event.endDate,
      gapMinutes: gapMinutes,
      startTime: startTime, // UTC start time (format: YYYY-MM-DDTHH:mm:ss)
      sessions: event.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        speaker: s.speaker || null,
        durationMin: s.durationMin,
        topic: s.topic,
        capacity: s.capacity,
      })),
      rooms: event.rooms.map((r) => ({
        id: r.id,
        name: r.name,
        capacity: r.capacity,
      })),
    };

    // Call AI service to generate schedule
    let scheduleResponse;
    try {
      scheduleResponse = await this.aiService.scheduleEvent(scheduleRequest);
    } catch (error: any) {
      this.logger.error(`Failed to generate schedule via AI service: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to generate schedule: ${error.message}`);
    }

    if (!scheduleResponse.success) {
      throw new BadRequestException(
        scheduleResponse.message || 'Failed to generate a feasible schedule'
      );
    }

    // If dryRun, return assignments without saving
    if (dryRun) {
      this.logger.log(`Dry run: Returning schedule assignments without saving to database for event ${eventId}`);
      return {
        assignments: scheduleResponse.assignments,
        success: true,
        message: scheduleResponse.message || 'Schedule generated successfully (preview)',
      };
    }

    // Update sessions with assigned room and startTime
    const updatedSessions: Session[] = [];
    for (const assignment of scheduleResponse.assignments) {
      const session = event.sessions.find((s) => s.id === assignment.sessionId);
      if (!session) {
        this.logger.warn(`Session ${assignment.sessionId} not found in event ${eventId}`);
        continue;
      }

      // Find room if assigned
      let room: Room | null = null;
      if (assignment.roomId) {
        room = event.rooms.find((r) => r.id === assignment.roomId) || null;
        if (!room) {
          this.logger.warn(`Room ${assignment.roomId} not found in event ${eventId}`);
        }
      }

      // Update session
      session.room = room;
      session.startTime = assignment.startTime ? new Date(assignment.startTime) : null;

      const updatedSession = await this.sessionRepo.save(session);
      updatedSessions.push(updatedSession);
    }

    this.logger.log(`Successfully generated and applied schedule for event ${eventId}`);

    return {
      assignments: scheduleResponse.assignments,
      success: true,
      message: scheduleResponse.message || 'Schedule generated successfully',
      sessions: updatedSessions,
    };
  }

  async applySchedule(eventId: number, organizerId: number, assignments: Array<{ sessionId: number; roomId?: number | null; startTime?: string | null }>) {
    this.logger.log(`Applying schedule for event ${eventId} by organizer ${organizerId}`);
    this.logger.log(`Received assignments: ${JSON.stringify(assignments, null, 2)}`);

    // Fetch event with relations
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'sessions', 'rooms'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Validate organizer
    if (event.organizer.id !== organizerId || event.organizer.role !== UserRole.ORGANIZER) {
      throw new ForbiddenException(`User ${organizerId} is not the organizer of event ${eventId}`);
    }

    // Update sessions with assigned room and startTime
    const sessionIds = assignments.map(a => a.sessionId);
    for (const assignment of assignments) {
      // Reload session from database to ensure we have fresh data
      const session = await this.sessionRepo.findOne({
        where: { id: assignment.sessionId, event: { id: eventId } },
        relations: ['event', 'room'],
      });
      
      if (!session) {
        this.logger.warn(`Session ${assignment.sessionId} not found in event ${eventId}`);
        continue;
      }

      // Find room if assigned - load from repository to ensure we have a proper entity
      let room: Room | null = null;
      if (assignment.roomId !== null && assignment.roomId !== undefined) {
        this.logger.log(`Looking for room ${assignment.roomId} in event ${eventId}`);
        room = await this.roomRepo.findOne({
          where: { id: assignment.roomId, event: { id: eventId } },
        });
        if (!room) {
          this.logger.warn(`Room ${assignment.roomId} not found in event ${eventId}`);
        } else {
          this.logger.log(`Found room: id=${room.id}, name=${room.name}`);
        }
      } else {
        this.logger.log(`Assignment for session ${assignment.sessionId} has no roomId (null or undefined)`);
      }

      // Update session
      const oldRoom = session.room?.id;
      const oldStartTime = session.startTime;
      session.room = room;
      // Parse startTime as UTC if provided (AI returns format "2026-01-17T09:00:00" without Z)
      if (assignment.startTime) {
        const timeString = assignment.startTime.endsWith('Z') ? assignment.startTime : assignment.startTime + 'Z';
        session.startTime = new Date(timeString);
      } else {
        session.startTime = null;
      }

      this.logger.log(`Updating session ${session.id} (${session.title}): room ${oldRoom}->${room?.id}, startTime ${oldStartTime?.toISOString()}->${assignment.startTime}`);

      const savedSession = await this.sessionRepo.save(session);
      this.logger.log(`Session ${session.id} saved. Room ID: ${savedSession.room?.id || 'null'}, StartTime: ${savedSession.startTime?.toISOString() || 'null'}`);
    }

    // Small delay to ensure all saves are committed to database
    await new Promise(resolve => setTimeout(resolve, 50));

    // Reload all updated sessions from database to ensure we have fresh data
    // Use a fresh query to avoid any caching issues
    const updatedSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.event', 'event')
      .leftJoinAndSelect('session.room', 'room')
      .where('session.id IN (:...ids)', { ids: sessionIds })
      .getMany();

    // Log what was reloaded to verify it's correct
    this.logger.log(`Reloaded sessions from database:`);
    updatedSessions.forEach(s => {
      this.logger.log(`  Session ${s.id} (${s.title}): roomId=${s.room?.id} (${s.room?.name}), startTime=${s.startTime?.toISOString()}`);
    });

    // Sort sessions by start time (earliest first), then by room name
    updatedSessions.sort((a, b) => {
      // First, sort by start time
      if (a.startTime && b.startTime) {
        const timeDiff = a.startTime.getTime() - b.startTime.getTime();
        if (timeDiff !== 0) {
          return timeDiff;
        }
      } else if (a.startTime && !b.startTime) {
        return -1; // a has time, b doesn't - a comes first
      } else if (!a.startTime && b.startTime) {
        return 1; // b has time, a doesn't - b comes first
      }

      // If same time or both null, sort by room name
      const roomA = a.room?.name || '';
      const roomB = b.room?.name || '';
      if (roomA && roomB) {
        return roomA.localeCompare(roomB);
      } else if (roomA && !roomB) {
        return -1;
      } else if (!roomA && roomB) {
        return 1;
      }

      // If both have no room, maintain original order
      return 0;
    });

    this.logger.log(`Successfully applied schedule for event ${eventId}. Reloaded ${updatedSessions.length} sessions from database.`);

    return {
      assignments,
      success: true,
      message: 'Schedule applied successfully',
      sessions: updatedSessions,
    };
  }
}
