import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venue } from '../events/venue.entity';
import { Event } from '../events/event.entity';
import { VenuesService } from './venues.service';
import { VenuesController } from './venues.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venue, Event]),
    UsersModule,
  ],
  providers: [VenuesService],
  controllers: [VenuesController],
  exports: [VenuesService],
})
export class VenuesModule {}

