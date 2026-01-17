
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsOptional, IsNotEmpty, IsArray, ValidateNested, Validate, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
export class IsDateRangeValidConstraint implements ValidatorConstraintInterface {
  validate(endDate: string, args: ValidationArguments) {
    const startDate = (args.object as CreateEventDto).startDate;
    if (!startDate || !endDate) return true; // Let other validators handle required checks
    return new Date(startDate) <= new Date(endDate);
  }

  defaultMessage(args: ValidationArguments) {
    return 'End date must be greater than or equal to start date';
  }
}

@ValidatorConstraint({ name: 'isStartDateNotPast', async: false })
export class IsStartDateNotPastConstraint implements ValidatorConstraintInterface {
  validate(startDate: string) {
    if (!startDate) return true; // Let other validators handle required checks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventStartDate = new Date(startDate);
    eventStartDate.setHours(0, 0, 0, 0);
    return eventStartDate >= today;
  }

  defaultMessage() {
    return 'Start date cannot be in the past';
  }
}

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
  @Validate(IsStartDateNotPastConstraint)
  startDate!: string;

  @ApiProperty({ description: 'The end date of the event', type: 'string', format: 'date' })
  @IsDateString()
  @Validate(IsDateRangeValidConstraint)
  endDate!: string;

  @ApiPropertyOptional({ description: 'The expected number of attendees' })
  @IsNumber()
  @IsOptional()
  expectedAudience!: number;

  @ApiPropertyOptional({ description: 'The budget for the event in LKR' })
  @IsString()
  @IsOptional()
  budget?: string;

  @ApiProperty({ description: 'The ID of the venue (required)' })
  @IsNumber()
  @IsNotEmpty()
  venueId!: number;

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
