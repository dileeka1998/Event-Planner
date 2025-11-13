import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { EventBudget } from './event-budget.entity';

export enum BudgetItemStatus {
  PLANNED = 'PLANNED',
  APPROVED = 'APPROVED',
  PURCHASED = 'PURCHASED',
  PAID = 'PAID',
}

@Entity('budget_items')
export class BudgetItem {
  @PrimaryGeneratedColumn() id!: number;
  @ManyToOne(() => EventBudget, (budget) => budget.items, { onDelete: 'CASCADE' })
  eventBudget!: EventBudget;
  @Column() category!: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ type: 'decimal', precision: 12, scale: 2 }) estimatedAmount!: string;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: '0' }) actualAmount!: string;
  @Column({ type: 'int', default: 1 }) quantity!: number;
  @Column({ nullable: true }) unit?: string;
  @Column({ nullable: true }) vendor?: string;
  @Column({ type: 'enum', enum: BudgetItemStatus, default: BudgetItemStatus.PLANNED })
  status!: BudgetItemStatus;
}

