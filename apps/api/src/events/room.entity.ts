import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Event } from '@events/event.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Event, (event) => event.rooms, { onDelete: 'CASCADE' }) event!: Event;
  @Column() name!: string;
  @Column({ type: 'int' }) capacity!: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) costPerHour!: string;
}
