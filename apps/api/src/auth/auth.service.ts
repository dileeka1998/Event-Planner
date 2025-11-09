
import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
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

  private generateToken(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }
}
