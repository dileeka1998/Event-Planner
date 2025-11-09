import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { Session } from './session.entity';
import { Room } from './room.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '@users/users.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, Session, Room]), UsersModule, AiModule],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
