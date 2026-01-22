import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { Event } from './event.entity';
import { Room } from '../rooms/room.entity';
import { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Room) private roomRepo: Repository<Room>,
  ) {}

  async create(eventId: number, dto: CreateSessionDto, organizerId: number) {
    this.logger.log(`Creating session for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      this.logger.warn(`Event with ID ${eventId} not found`);
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Verify user is the event organizer
    if (event.organizer.id !== organizerId) {
      this.logger.warn(`User ${organizerId} is not the organizer of event ${eventId}`);
      throw new ForbiddenException('You can only create sessions for events you organize');
    }

    // Validate room belongs to event if roomId provided
    let room: Room | null = null;
    if (dto.roomId) {
      room = await this.roomRepo.findOne({
        where: { id: dto.roomId, event: { id: eventId } },
      });

      if (!room) {
        this.logger.warn(`Room ${dto.roomId} does not belong to event ${eventId}`);
        throw new BadRequestException(`Room with ID ${dto.roomId} does not belong to this event`);
      }
    }

    // Validate startTime is within event date range if provided
    if (dto.startTime) {
      const startTime = new Date(dto.startTime);
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      eventEnd.setHours(23, 59, 59, 999); // End of day

      if (startTime < eventStart || startTime > eventEnd) {
        this.logger.warn(`Session startTime ${dto.startTime} is outside event date range`);
        throw new BadRequestException('Session start time must be within the event date range');
      }
    }

    // Validate capacity: if room assigned, validate against room capacity, otherwise against event capacity
    if (room) {
      // Session has a room - validate against room capacity
      if (dto.capacity > room.capacity) {
        this.logger.warn(`Session capacity ${dto.capacity} exceeds room capacity ${room.capacity}`);
        throw new BadRequestException(
          `Session capacity (${dto.capacity}) cannot exceed room capacity (${room.capacity})`
        );
      }
    } else {
      // Session has no room - validate against event capacity
      if (dto.capacity > event.expectedAudience) {
        this.logger.warn(`Session capacity ${dto.capacity} exceeds event capacity ${event.expectedAudience}`);
        throw new BadRequestException(
          `Session capacity (${dto.capacity}) cannot exceed event capacity (${event.expectedAudience})`
        );
      }
    }

    // Create session
    const session = this.sessionRepo.create({
      event,
      title: dto.title,
      speaker: dto.speaker || undefined,
      durationMin: dto.durationMin,
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      room: room || null,
      topic: dto.topic || 'General',
      capacity: dto.capacity || 0,
    });

    const savedSession = await this.sessionRepo.save(session);
    this.logger.log(`Session ${savedSession.id} created successfully for event ${eventId}`);

    // Return session with relations
    return this.sessionRepo.findOne({
      where: { id: savedSession.id },
      relations: ['event', 'room'],
    });
  }

  async findAll(eventId: number) {
    this.logger.log(`Fetching all sessions for event ${eventId}`);

    const event = await this.eventRepo.findOneBy({ id: eventId });
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return this.sessionRepo.find({
      where: { event: { id: eventId } },
      relations: ['event', 'room'],
      order: { startTime: 'ASC' },
    });
  }

  async update(eventId: number, sessionId: number, dto: Partial<CreateSessionDto>, organizerId: number) {
    this.logger.log(`Updating session ${sessionId} for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists and user is organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only update sessions for events you organize');
    }

    // Find session
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, event: { id: eventId } },
      relations: ['event', 'room'],
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found in event ${eventId}`);
    }

    // Validate room if roomId is being updated
    if (dto.roomId !== undefined) {
      if (dto.roomId === null) {
        session.room = null;
      } else {
        const room = await this.roomRepo.findOne({
          where: { id: dto.roomId, event: { id: eventId } },
        });

        if (!room) {
          throw new BadRequestException(`Room with ID ${dto.roomId} does not belong to this event`);
        }
        session.room = room;
      }
    }

    // Validate startTime if being updated
    if (dto.startTime !== undefined) {
      if (dto.startTime === null) {
        session.startTime = null;
      } else {
        const startTime = new Date(dto.startTime);
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        eventEnd.setHours(23, 59, 59, 999);

        if (startTime < eventStart || startTime > eventEnd) {
          throw new BadRequestException('Session start time must be within the event date range');
        }
        session.startTime = startTime;
      }
    }

    // Update other fields
    if (dto.title !== undefined) session.title = dto.title;
    if (dto.speaker !== undefined) {
      session.speaker = dto.speaker || (null as any);
    }
    if (dto.durationMin !== undefined) session.durationMin = dto.durationMin;
    if (dto.topic !== undefined) {
      session.topic = dto.topic || 'General';
    }
    if (dto.capacity !== undefined) {
      // Validate capacity: if room assigned, validate against room capacity, otherwise against event capacity
      // Use the room from session (which may have been updated above)
      if (session.room) {
        // Session has a room - validate against room capacity
        if (dto.capacity > session.room.capacity) {
          this.logger.warn(`Session capacity ${dto.capacity} exceeds room capacity ${session.room.capacity}`);
          throw new BadRequestException(
            `Session capacity (${dto.capacity}) cannot exceed room capacity (${session.room.capacity})`
          );
        }
      } else {
        // Session has no room - validate against event capacity
        if (dto.capacity > event.expectedAudience) {
          this.logger.warn(`Session capacity ${dto.capacity} exceeds event capacity ${event.expectedAudience}`);
          throw new BadRequestException(
            `Session capacity (${dto.capacity}) cannot exceed event capacity (${event.expectedAudience})`
          );
        }
      }
      session.capacity = dto.capacity;
    }

    // Validate time conflicts before saving
    // Check if startTime or roomId was updated, or if durationMin was updated
    const timeOrRoomUpdated = dto.startTime !== undefined || dto.roomId !== undefined || dto.durationMin !== undefined;
    
    if (timeOrRoomUpdated && session.startTime) {
      // Get the final values (may have been updated above)
      const finalStartTime = session.startTime;
      const finalDuration = session.durationMin;
      const finalRoomId = session.room?.id || null;
      
      // Load all other sessions for this event to check conflicts
      const allSessions = await this.sessionRepo.find({
        where: { event: { id: eventId } },
        relations: ['room'],
      });
      
      // Calculate session end time
      const sessionEndTime = new Date(finalStartTime);
      sessionEndTime.setMinutes(sessionEndTime.getMinutes() + finalDuration);
      
      // Default gap time (0 minutes) - can be made configurable if needed
      const gapMinutes = 0;
      const gapMs = gapMinutes * 60 * 1000;
      
      // Check for conflicts
      for (const otherSession of allSessions) {
        // Skip the session being updated
        if (otherSession.id === sessionId) {
          continue;
        }
        
        // Skip if other session has no start time
        if (!otherSession.startTime) {
          continue;
        }
        
        const otherStartTime = new Date(otherSession.startTime);
        const otherEndTime = new Date(otherStartTime);
        otherEndTime.setMinutes(otherEndTime.getMinutes() + otherSession.durationMin);
        const otherRoomId = otherSession.room?.id || null;
        
        // Check if sessions overlap (accounting for gap time)
        const sessionsOverlap = !(
          sessionEndTime.getTime() + gapMs <= otherStartTime.getTime() ||
          otherEndTime.getTime() + gapMs <= finalStartTime.getTime()
        );
        
        if (sessionsOverlap) {
          // Check conflict type
          const conflictData: any = {
            sessionId: session.id,
            conflictingSessionId: otherSession.id,
            sessionTitle: session.title,
            conflictingSessionTitle: otherSession.title,
          };
          
          if (finalRoomId === null && otherRoomId === null) {
            // Both are whole venue - conflict!
            conflictData.conflictType = 'whole_venue';
          } else if (finalRoomId === null || otherRoomId === null) {
            // One is whole venue, one is roomed - conflict!
            conflictData.conflictType = 'whole_venue';
          } else if (finalRoomId === otherRoomId) {
            // Same room - conflict!
            conflictData.conflictType = 'same_room';
            conflictData.roomName = session.room?.name || 'Unknown';
          }
          
          // Throw error with conflict data in response
          throw new BadRequestException({
            message: `Session "${session.title}" conflicts with another session.`,
            conflictData: conflictData,
          });
        }
      }
    }

    const updatedSession = await this.sessionRepo.save(session);
    this.logger.log(`Session ${sessionId} updated successfully`);

    return this.sessionRepo.findOne({
      where: { id: updatedSession.id },
      relations: ['event', 'room'],
    });
  }

  async remove(eventId: number, sessionId: number, organizerId: number) {
    this.logger.log(`Deleting session ${sessionId} for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists and user is organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only delete sessions for events you organize');
    }

    // Find and delete session
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, event: { id: eventId } },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found in event ${eventId}`);
    }

    await this.sessionRepo.remove(session);
    this.logger.log(`Session ${sessionId} deleted successfully`);

    return { message: 'Session deleted successfully' };
  }

}
