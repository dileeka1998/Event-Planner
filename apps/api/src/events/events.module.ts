import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './event.entity';
import { Session } from './session.entity';
import { Room } from './room.entity';
import { Venue } from './venue.entity';
import { EventBudget } from './event-budget.entity';
import { BudgetItem } from './budget-item.entity';
import { EventAttendee } from './event-attendee.entity';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AttendeesService } from './attendees.service';
import { AttendeesController } from './attendees.controller';
import { UsersModule } from '@users/users.module';
import { User } from '@users/user.entity';
import { AiModule } from '../ai/ai.module';
import { VenuesModule } from '../venues/venues.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Session, Room, Venue, EventBudget, BudgetItem, EventAttendee, User]),
    UsersModule,
    AiModule,
    VenuesModule,
  ],
  providers: [EventsService, AttendeesService],
  controllers: [EventsController, AttendeesController],
  exports: [EventsService],
})
export class EventsModule {}
