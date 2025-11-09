import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { User } from '@users/user.entity';
import { Session } from '@events/session.entity';
import { Room } from '@events/room.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => User, { eager: true }) organizer!: User;
  @Column() title!: string;
  @Column({ type: 'date' }) startDate!: string;
  @Column({ type: 'date' }) endDate!: string;
  @Column({ type: 'int', default: 0 }) expectedAudience!: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 }) budget!: string;
  @OneToMany(() => Room, (room) => room.event, { cascade: true }) rooms!: Room[];
  @OneToMany(() => Session, (session) => session.event, { cascade: true }) sessions!: Session[];
}
