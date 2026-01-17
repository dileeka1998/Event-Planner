import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';

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

    // Prevent deleting admin users
    if (user.role === UserRole.ADMIN) {
      this.logger.warn(`Admin ${adminId} attempted to delete admin user ${userId}`);
      throw new BadRequestException('Cannot delete admin users');
    }

    // Delete the user
    await this.userRepo.remove(user);
    this.logger.log(`User ${userId} successfully deleted by admin ${adminId}`);
  }

  async updateUser(
    userId: number,
    adminId: number,
    updateUserDto: UpdateUserDto,
  ) {
    this.logger.log(`Admin ${adminId} attempting to update user ${userId}`);

    // Prevent admin from updating themselves
    if (userId === adminId) {
      this.logger.warn(`Admin ${adminId} attempted to update themselves`);
      throw new BadRequestException('You cannot update your own account');
    }

    // Check if user exists
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) {
      this.logger.warn(`User with ID ${userId} not found`);
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Prepare update object
    const updates: Partial<User> = {};
    
    if (updateUserDto.name !== undefined) {
      updates.name = updateUserDto.name;
    }
    
    if (updateUserDto.email !== undefined) {
      updates.email = updateUserDto.email;
    }
    
    if (updateUserDto.role !== undefined) {
      updates.role = updateUserDto.role;
    }
    
    // Hash password if provided
    if (updateUserDto.password) {
      updates.passwordHash = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Apply updates
    Object.assign(user, updates);

    const updatedUser = await this.userRepo.save(user);
    this.logger.log(`User ${userId} successfully updated by admin ${adminId}`);

    return updatedUser;
  }

  async findAllUsers(options?: { page?: number; limit?: number; search?: string; role?: UserRole }) {
    this.logger.log('Fetching users with pagination and filters:', options);
    
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const search = options?.search?.trim();
    const role = options?.role;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepo.createQueryBuilder('user');

    // Always exclude admin users from results
    queryBuilder.where('user.role != :adminRole', { adminRole: UserRole.ADMIN });

    // Apply search filter if provided
    if (search) {
      queryBuilder.andWhere(
        '(user.name LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply role filter if provided (but never allow ADMIN role filter)
    if (role && role !== UserRole.ADMIN) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

}
