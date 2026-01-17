import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../events/venue.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(
    @InjectRepository(Venue) private repo: Repository<Venue>,
    private usersService: UsersService,
  ) {}

  async create(dto: Partial<Venue>, organizerId: number) {
    this.logger.log(`Creating venue: ${dto.name} for organizer ${organizerId}`);
    
    // Validate organizer
    const organizer = await this.usersService.findById(organizerId);
    if (!organizer) {
      throw new BadRequestException('Organizer not found');
    }

    const venue = this.repo.create({
      ...dto,
      organizer,
    });
    return this.repo.save(venue);
  }

  async findAll(organizerId: number) {
    this.logger.log(`Fetching venues for organizer ${organizerId}`);
    return this.repo.find({
      where: { organizer: { id: organizerId } },
      relations: ['organizer'],
    });
  }

  async findOne(id: number, organizerId?: number) {
    this.logger.log(`Fetching venue with ID: ${id}`);
    const venue = await this.repo.findOne({
      where: { id },
      relations: ['organizer'],
    });
    
    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }

    // Verify ownership if organizerId is provided
    if (organizerId && venue.organizer.id !== organizerId) {
      throw new ForbiddenException(`User ${organizerId} is not the organizer of venue ${id}`);
    }

    return venue;
  }

  async update(id: number, dto: Partial<Venue>, organizerId: number) {
    this.logger.log(`Updating venue with ID: ${id} by organizer ${organizerId}`);
    
    // Verify ownership
    const venue = await this.findOne(id, organizerId);
    
    Object.assign(venue, dto);
    return this.repo.save(venue);
  }

  async remove(id: number, organizerId: number) {
    this.logger.log(`Deleting venue with ID: ${id} by organizer ${organizerId}`);
    
    // Verify ownership
    const venue = await this.findOne(id, organizerId);
    
    await this.repo.remove(venue);
    return { message: 'Venue deleted successfully' };
  }
}

