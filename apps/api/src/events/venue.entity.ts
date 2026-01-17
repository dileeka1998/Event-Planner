import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => User, { eager: true }) organizer!: User;
  @Column() name!: string;
  @Column() address!: string;
  @Column({ type: 'int' }) capacity!: number;
  @Column({ nullable: true }) contactName?: string;
  @Column({ nullable: true }) contactPhone?: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true }) hourlyRate?: string;
  @Column({ type: 'text', nullable: true }) notes?: string;
}

