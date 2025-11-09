import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole { ADMIN='ADMIN', ORGANIZER='ORGANIZER', ATTENDEE='ATTENDEE' }

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ unique: true }) email!: string;
  @Column() name!: string;
  @Column() passwordHash!: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.ATTENDEE }) role!: UserRole;
  @CreateDateColumn() createdAt!: Date;
}
