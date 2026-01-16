import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '@events/event.entity';
import { Room } from '@events/room.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Event, (event) => event.sessions, { onDelete: 'CASCADE' }) event!: Event;
  @ManyToOne(() => Room, { nullable: true }) room!: Room | null;
  @Column() title!: string;
  @Column({ nullable: true }) speaker!: string;
  @Column({ type: 'int', default: 60 }) durationMin!: number;
  @Column({ type: 'datetime', nullable: true }) startTime!: Date | null;
  @Column({ default: 'General' }) topic!: string;
  @Column({ type: 'int', default: 0 }) capacity!: number;
}
