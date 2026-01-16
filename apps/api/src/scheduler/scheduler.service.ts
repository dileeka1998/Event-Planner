import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async generateSchedule(eventId: number, organizerId: number, gapMinutes: number = 0) {
    this.logger.log(`Generating schedule for event ${eventId} by organizer ${organizerId} with gap time: ${gapMinutes} minutes`);

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
}
