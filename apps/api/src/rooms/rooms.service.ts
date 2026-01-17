import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room } from './room.entity';
import { Event } from '../events/event.entity';
import { Session } from '../events/session.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room) private roomRepo: Repository<Room>,
    @InjectRepository(Event) private eventRepo: Repository<Event>,
    @InjectRepository(Session) private sessionRepo: Repository<Session>,
  ) {}

  async create(eventId: number, dto: CreateRoomDto, organizerId: number) {
    this.logger.log(`Creating room for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists and user is organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.organizer.id !== organizerId) {
      this.logger.warn(`User ${organizerId} is not the organizer of event ${eventId}`);
      throw new ForbiddenException('You can only create rooms for events you organize');
    }

    // Validate room capacity doesn't exceed venue capacity if venue exists
    if (event.venue && dto.capacity > event.venue.capacity) {
      this.logger.warn(`Room capacity ${dto.capacity} exceeds venue capacity ${event.venue.capacity}`);
      throw new BadRequestException(
        `Room capacity (${dto.capacity}) cannot exceed venue capacity (${event.venue.capacity})`
      );
    }

    const room = this.roomRepo.create({
      event,
      name: dto.name,
      capacity: dto.capacity,
    });

    const savedRoom = await this.roomRepo.save(room);
    this.logger.log(`Room ${savedRoom.id} created successfully for event ${eventId}`);
    return savedRoom;
  }

  async findAll(eventId: number, organizerId?: number) {
    this.logger.log(`Fetching all rooms for event ${eventId}`);

    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });
    
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    // Verify organizer ownership if organizerId is provided
    if (organizerId && event.organizer.id !== organizerId) {
      throw new ForbiddenException(`User ${organizerId} is not the organizer of event ${eventId}`);
    }

    return this.roomRepo.find({
      where: { event: { id: eventId } },
      order: { name: 'ASC' },
    });
  }

  async findOne(eventId: number, roomId: number) {
    this.logger.log(`Fetching room ${roomId} for event ${eventId}`);

    const room = await this.roomRepo.findOne({
      where: { id: roomId, event: { id: eventId } },
      relations: ['event'],
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found for event ${eventId}`);
    }

    return room;
  }

  async update(eventId: number, roomId: number, dto: Partial<CreateRoomDto>, organizerId: number) {
    this.logger.log(`Updating room ${roomId} for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists and user is organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer', 'venue'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only update rooms for events you organize');
    }

    const room = await this.findOne(eventId, roomId);

    // Validate room capacity doesn't exceed venue capacity if venue exists and capacity is being updated
    if (dto.capacity !== undefined && event.venue && dto.capacity > event.venue.capacity) {
      this.logger.warn(`Room capacity ${dto.capacity} exceeds venue capacity ${event.venue.capacity}`);
      throw new BadRequestException(
        `Room capacity (${dto.capacity}) cannot exceed venue capacity (${event.venue.capacity})`
      );
    }

    if (dto.name !== undefined) room.name = dto.name;
    if (dto.capacity !== undefined) room.capacity = dto.capacity;

    const updatedRoom = await this.roomRepo.save(room);
    this.logger.log(`Room ${roomId} updated successfully`);
    return updatedRoom;
  }

  async remove(eventId: number, roomId: number, organizerId: number) {
    this.logger.log(`Deleting room ${roomId} for event ${eventId} by organizer ${organizerId}`);

    // Validate event exists and user is organizer
    const event = await this.eventRepo.findOne({
      where: { id: eventId },
      relations: ['organizer'],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.organizer.id !== organizerId) {
      throw new ForbiddenException('You can only delete rooms for events you organize');
    }

    const room = await this.findOne(eventId, roomId);

    // Check if room is being used by any sessions
    const sessionsUsingRoom = await this.sessionRepo.findOne({
      where: { room: { id: roomId } },
    });

    if (sessionsUsingRoom) {
      throw new BadRequestException(
        `Cannot delete room "${room.name}" because it is assigned to one or more sessions. Please reassign or remove those sessions first.`
      );
    }

    await this.roomRepo.remove(room);
    this.logger.log(`Room ${roomId} deleted successfully`);
    return { message: 'Room deleted successfully' };
  }
}
