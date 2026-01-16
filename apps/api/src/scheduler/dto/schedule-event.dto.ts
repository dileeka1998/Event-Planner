import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';

export class ScheduleEventRequestDto {
  @ApiPropertyOptional({ description: 'Gap time in minutes between sessions in the same room', default: 0, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  gapMinutes?: number;
}

export class ScheduleEventResponseDto {
  @ApiProperty({ description: 'List of session assignments with room and time' })
  assignments!: ScheduleAssignmentDto[];

  @ApiProperty({ description: 'Whether the schedule was generated successfully' })
  success!: boolean;

  @ApiPropertyOptional({ description: 'Message about the scheduling result' })
  message?: string;
}

export class ScheduleAssignmentDto {
  @ApiProperty({ description: 'ID of the session' })
  sessionId!: number;

  @ApiPropertyOptional({ description: 'ID of the assigned room' })
  roomId?: number | null;

  @ApiPropertyOptional({ description: 'Assigned start time (ISO datetime string)' })
  startTime?: string | null;
}
