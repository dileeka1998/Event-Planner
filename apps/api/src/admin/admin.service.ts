import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async deleteUser(userId: number, adminId: number): Promise<void> {
    this.logger.log(`Admin ${adminId} attempting to delete user ${userId}`);

    // Prevent admin from deleting themselves
    if (userId === adminId) {
      this.logger.warn(`Admin ${adminId} attempted to delete themselves`);
      throw new BadRequestException('You cannot delete your own account');
    }

    // Check if user exists
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete the user
    await this.userRepo.remove(user);
    this.logger.log(`User ${userId} successfully deleted by admin ${adminId}`);
  }
}
