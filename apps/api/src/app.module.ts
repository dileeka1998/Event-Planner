import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { User } from '@users/user.entity';
import { Event } from '@events/event.entity';
import { Session } from '@events/session.entity';
import { Room } from '@events/room.entity';
import { UsersModule } from '@users/users.module';
import { EventsModule } from '@events/events.module';
import { AiModule } from './ai/ai.module';

import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [User, Event, Session, Room],
      synchronize: true,
      retryAttempts: 20,
      retryDelay: 3000,
    }),
    HttpModule.register({
      baseURL: process.env.AI_BASE_URL || 'http://ai:8000',
      timeout: 10000,
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    AiModule,
  ],
})
export class AppModule {}
