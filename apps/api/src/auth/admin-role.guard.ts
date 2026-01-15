import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '../users/user.entity';

@Injectable()
export class AdminRoleGuard extends JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(AdminRoleGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    this.logger.log(`AdminRoleGuard: Checking access for ${request.method} ${request.url}`);
    
    // First check if user is authenticated (via JwtAuthGuard)
    const isAuthenticated = await super.canActivate(context);
    if (!isAuthenticated) {
      this.logger.warn(`AdminRoleGuard: Authentication failed for ${request.url}`);
      return false;
    }

    // Get the request object
    const user = request.user;
    this.logger.log(`AdminRoleGuard: User authenticated - ID: ${user?.userId}, Role: ${user?.role}`);

    // Check if user has ADMIN role
    if (!user || user.role !== UserRole.ADMIN) {
      this.logger.warn(`AdminRoleGuard: Access denied - User role: ${user?.role}, Required: ADMIN`);
      throw new ForbiddenException('Access denied. Admin role required.');
    }

    this.logger.log(`AdminRoleGuard: Access granted for admin user ${user.userId}`);
    return true;
  }
}
