import { Controller, Get, UseGuards, Req, Param, Patch, Body, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getAll() {
    return this.users.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Return current user profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@Req() req: any) {
    // req.user is populated by JwtStrategy
    return this.users.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Return user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  getById(@Param('id') id: string) {
    return this.users.findById(Number(id));
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    return this.users.updateProfile(userId, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({ status: 200, description: 'Password successfully changed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 400, description: 'Bad request - incorrect current password.' })
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('User ID not found in token');
    }
    try {
      return await this.users.changePassword(
        userId,
        changePasswordDto.currentPassword,
        changePasswordDto.newPassword
      );
    } catch (error: any) {
      if (error?.message === 'Current password is incorrect') {
        throw new BadRequestException('Current password is incorrect');
      }
      if (error?.message === 'User not found') {
        throw new BadRequestException('User not found');
      }
      throw error;
    }
  }
}
