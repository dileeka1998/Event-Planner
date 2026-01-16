import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { Event } from '../events/event.entity';
import { Session } from '../events/session.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => Event, (event) => event.rooms, { onDelete: 'CASCADE' }) event!: Event;
  @OneToMany(() => Session, (session) => session.room) sessions!: Session[];
  @Column() name!: string;
  @Column({ type: 'int' }) capacity!: number;
}
