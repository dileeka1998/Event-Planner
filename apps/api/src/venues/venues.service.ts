import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venue } from '../events/venue.entity';

@Injectable()
export class VenuesService {
  private readonly logger = new Logger(VenuesService.name);

  constructor(@InjectRepository(Venue) private repo: Repository<Venue>) {}

  async create(dto: Partial<Venue>) {
    this.logger.log(`Creating venue: ${dto.name}`);
    const venue = this.repo.create(dto);
    return this.repo.save(venue);
  }

  findAll() {
    this.logger.log('Fetching all venues');
    return this.repo.find();
  }

  async findOne(id: number) {
    this.logger.log(`Fetching venue with ID: ${id}`);
    const venue = await this.repo.findOneBy({ id });
    if (!venue) {
      throw new NotFoundException(`Venue with ID ${id} not found`);
    }
    return venue;
  }

  async update(id: number, dto: Partial<Venue>) {
    this.logger.log(`Updating venue with ID: ${id}`);
    const venue = await this.findOne(id);
    Object.assign(venue, dto);
    return this.repo.save(venue);
  }

  async remove(id: number) {
    this.logger.log(`Deleting venue with ID: ${id}`);
    const venue = await this.findOne(id);
    await this.repo.remove(venue);
    return { message: 'Venue deleted successfully' };
  }
}

