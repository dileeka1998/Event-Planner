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

  async update(id: number, updates: Partial<User>) {
    this.logger.log(`Updating user with ID: ${id}`);
    await this.repo.update(id, updates);
    return this.repo.findOneBy({ id });
  }

  findByResetToken(token: string) {
    this.logger.log(`Finding user by reset token`);
    return this.repo.findOneBy({ resetToken: token });
  }

  async updateProfile(userId: number, updates: { name?: string; email?: string }) {
    this.logger.log(`Updating profile for user ID: ${userId}`);
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.name !== undefined) {
      user.name = updates.name;
    }
    if (updates.email !== undefined) {
      user.email = updates.email;
    }

    const updatedUser = await this.repo.save(user);
    this.logger.log(`Profile updated for user ID: ${userId}`);
    return updatedUser;
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    this.logger.log(`Changing password for user ID: ${userId}`);
    const user = await this.repo.findOneBy({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash and update new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = newPasswordHash;

    const updatedUser = await this.repo.save(user);
    this.logger.log(`Password changed for user ID: ${userId}`);
    return updatedUser;
  }
}
