import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@InjectRepository(User) private repo: Repository<User>) {}

  async create(email: string, name: string, password: string, role?: UserRole) {
    this.logger.log(`Creating user with email: ${email}, role: ${role || 'ATTENDEE (default)'}`);
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.repo.create({ 
      email, 
      name, 
      passwordHash, 
      role: role || UserRole.ATTENDEE 
    });
    const savedUser = await this.repo.save(user);
    this.logger.log(`User created with ID: ${savedUser.id}`);
    return savedUser;
  }

  findAll() {
    this.logger.log('Fetching all users');
    return this.repo.find();
  }

  findById(id: number) {
    this.logger.log(`Fetching user with ID: ${id}`);
    return this.repo.findOneBy({ id });
  }

  findByEmail(email: string) {
    this.logger.log(`Fetching user with email: ${email}`);
    return this.repo.findOneBy({ email });
  }
}
