import { Controller, Delete, Param, ParseIntPipe, UseGuards, Req, HttpCode, HttpStatus, Logger, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminRoleGuard } from '../auth/admin-role.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('admin')
@Controller('admin')
@UseGuards(AdminRoleGuard)
@ApiBearerAuth()
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User successfully deleted.' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., attempting to delete own account).' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deleteUser(@Param('id', ParseIntPipe) userId: number, @Req() req: any) {
    this.logger.log(`DELETE /admin/users/${userId} - Request received`);
    this.logger.log(`Request user: ${JSON.stringify(req.user)}`);
    
    const adminId = req.user?.userId;
    if (!adminId) {
      this.logger.error('No admin ID found in request');
      throw new Error('Admin ID not found in request');
    }
    
    this.logger.log(`Admin ${adminId} attempting to delete user ${userId}`);
    await this.adminService.deleteUser(userId, adminId);
    this.logger.log(`DELETE /admin/users/${userId} - Success`);
  }

  @Patch('users/:id')
@ApiOperation({ summary: 'Update a user (Admin only)' })
@ApiResponse({ status: 200, description: 'User successfully updated.' })
@ApiResponse({ status: 400, description: 'Bad request.' })
@ApiResponse({ status: 401, description: 'Unauthorized.' })
@ApiResponse({ status: 403, description: 'Forbidden. Admin role required.' })
@ApiResponse({ status: 404, description: 'User not found.' })
async updateUser(
  @Param('id', ParseIntPipe) userId: number,
  @Body() updateUserDto: UpdateUserDto,
  @Req() req: any,
) {
  this.logger.log(`PATCH /admin/users/${userId} - Request received`);
  this.logger.log(`Request user: ${JSON.stringify(req.user)}`);
  this.logger.log(`Update payload: ${JSON.stringify(updateUserDto)}`);

  const adminId = req.user?.userId;
  if (!adminId) {
    this.logger.error('No admin ID found in request');
    throw new Error('Admin ID not found in request');
  }

  this.logger.log(`Admin ${adminId} attempting to update user ${userId}`);
  const updatedUser = await this.adminService.updateUser(
    userId,
    adminId,
    updateUserDto,
  );
  this.logger.log(`PATCH /admin/users/${userId} - Success`);

  return updatedUser;
}

}
