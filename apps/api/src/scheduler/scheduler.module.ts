import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../events/event.entity';
import { Session } from '../events/session.entity';
import { Room } from '../rooms/room.entity';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Session, Room]),
    AiModule,
  ],
  providers: [SchedulerService],
  controllers: [SchedulerController],
  exports: [SchedulerService],
})
export class SchedulerModule {}
