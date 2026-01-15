import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { Event } from './event.entity';
import { Room } from './room.entity';
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

    // Create session
    const session = this.sessionRepo.create({
      event,
      title: dto.title,
      speaker: dto.speaker || undefined,
      durationMin: dto.durationMin,
      startTime: dto.startTime ? new Date(dto.startTime) : null,
      room: room || null,
      topic: dto.topic || 'General',
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
