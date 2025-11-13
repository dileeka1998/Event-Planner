import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Event } from './event.entity';
import { BudgetItem } from './budget-item.entity';

@Entity('event_budgets')
export class EventBudget {
  @PrimaryGeneratedColumn() id!: number;
  @OneToOne(() => Event, (event) => event.eventBudget, { onDelete: 'CASCADE' })
  @JoinColumn()
  event!: Event;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0' }) totalEstimated!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0' }) totalActual!: string;
  @OneToMany(() => BudgetItem, (item) => item.eventBudget, { cascade: true, eager: true })
  items!: BudgetItem[];
}

