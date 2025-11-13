import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { Event } from './event.entity';
import { User } from '@users/user.entity';

export enum AttendeeStatus {
  CONFIRMED = 'CONFIRMED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

@Entity('event_attendees')
@Unique(['eventId', 'userId'])
export class EventAttendee {
  @PrimaryGeneratedColumn() id!: number;
  @Column() eventId!: number;
  @Column() userId!: number;
  @ManyToOne(() => Event, { onDelete: 'CASCADE' })
  event!: Event;
  @ManyToOne(() => User, { eager: true })
  user!: User;
  @Column({ type: 'enum', enum: AttendeeStatus, default: AttendeeStatus.CONFIRMED })
  status!: AttendeeStatus;
  @CreateDateColumn() joinedAt!: Date;
}

