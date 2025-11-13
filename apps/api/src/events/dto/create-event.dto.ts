
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsOptional, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BudgetItemDto {
  @ApiProperty({ description: 'Category of the budget item' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ description: 'Description of the budget item' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Estimated amount in LKR' })
  @IsString()
  estimatedAmount!: string;

  @ApiPropertyOptional({ description: 'Actual amount in LKR', default: '0' })
  @IsString()
  @IsOptional()
  actualAmount?: string;

  @ApiPropertyOptional({ description: 'Quantity', default: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiPropertyOptional({ description: 'Vendor name' })
  @IsString()
  @IsOptional()
  vendor?: string;
}

export class CreateEventDto {
  @ApiProperty({ description: 'The ID of the user organizing the event' })
  @IsNumber()
  organizerId!: number;

  @ApiProperty({ description: 'The title of the event' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'The start date of the event', type: 'string', format: 'date' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ description: 'The end date of the event', type: 'string', format: 'date' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ description: 'The expected number of attendees' })
  @IsNumber()
  @IsOptional()
  expectedAudience?: number;

  @ApiPropertyOptional({ description: 'The budget for the event in LKR' })
  @IsString()
  @IsOptional()
  budget?: string;

  @ApiPropertyOptional({ description: 'The ID of the venue' })
  @IsNumber()
  @IsOptional()
  venueId?: number;

  @ApiPropertyOptional({ description: 'A natural language brief of the event for AI processing' })
  @IsString()
  @IsOptional()
  brief?: string;

  @ApiPropertyOptional({ description: 'Budget items for the event', type: [BudgetItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  @IsOptional()
  budgetItems?: BudgetItemDto[];
}
