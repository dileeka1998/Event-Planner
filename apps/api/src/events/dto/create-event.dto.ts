
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'A natural language brief of the event for AI processing' })
  @IsString()
  @IsOptional()
  brief?: string;
}
