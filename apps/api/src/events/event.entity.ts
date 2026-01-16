import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { User } from '@users/user.entity';
import { Session } from '@events/session.entity';
import { Room } from '../rooms/room.entity';
import { Venue } from './venue.entity';
import { EventBudget } from './event-budget.entity';
import { EventAttendee } from './event-attendee.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => User, { eager: true }) organizer!: User;
  @Column() title!: string;
  @Column({ type: 'date' }) startDate!: string;
  @Column({ type: 'date' }) endDate!: string;
  @Column({ type: 'int', default: 0 }) expectedAudience!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budget!: string;
  @ManyToOne(() => Venue, { nullable: true, eager: true }) venue?: Venue;
  @OneToOne(() => EventBudget, (eventBudget) => eventBudget.event, { cascade: true, eager: true }) eventBudget?: EventBudget;
  @OneToMany(() => Room, (room) => room.event, { cascade: true }) rooms!: Room[];
  @OneToMany(() => Session, (session) => session.event, { cascade: true }) sessions!: Session[];
  @OneToMany(() => EventAttendee, (attendee) => attendee.event, { cascade: true }) attendees!: EventAttendee[];
}
