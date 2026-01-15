
import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signUp(signupDto: SignupDto) {
    this.logger.log(`Attempting to sign up user with email: ${signupDto.email}`);
    const { email, name, password } = signupDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      this.logger.warn(`Signup failed: email already exists - ${email}`);
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.usersService.create(email, name, password);
    const token = this.generateToken(user);
    
    this.logger.log(`User signed up successfully: ${email}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = user;
    return { user: userResponse, token };
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Attempting to login user with email: ${loginDto.email}`);
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);
    console.log(user)

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.logger.warn(`Login failed: invalid credentials for email - ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);
    this.logger.log(`User logged in successfully: ${email}`);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userResponse } = user;
    return { user: userResponse, token };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    this.logger.log(`Password reset requested for email: ${forgotPasswordDto.email}`);
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);
    
    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      this.logger.warn(`Password reset requested for non-existent email: ${email}`);
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token expires in 1 hour

    // Save token to user
    await this.usersService.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    this.logger.log(`Reset token generated for user: ${email}`);
    
    // Return token in response (frontend will use it to redirect to reset page)
    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
      token: resetToken, // Frontend will use this to redirect to reset password page
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    this.logger.log('Password reset attempt');
    const { token, password, confirmPassword } = resetPasswordDto;

    // Validate passwords match
    if (password !== confirmPassword) {
      this.logger.warn('Password reset failed: passwords do not match');
      throw new BadRequestException('Passwords do not match');
    }

    // Find user by reset token
    const user = await this.usersService.findByResetToken(token);
    if (!user) {
      this.logger.warn('Password reset failed: invalid token');
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token has expired
    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      this.logger.warn(`Password reset failed: expired token for user ${user.email}`);
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await this.usersService.update(user.id, {
      passwordHash,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });

    this.logger.log(`Password reset successful for user: ${user.email}`);
    return { message: 'Password has been reset successfully' };
  }

  private generateToken(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }
}
