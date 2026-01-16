import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, Max, IsBoolean, IsString } from 'class-validator';

export class ScheduleEventRequestDto {
  @ApiPropertyOptional({ description: 'Gap time in minutes between sessions in the same room', default: 0, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  gapMinutes?: number;

  @ApiPropertyOptional({ description: 'If true, generate schedule without saving to database (preview mode)', default: false })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({ description: 'Event start time in UTC (format: YYYY-MM-DDTHH:mm:ss)', example: '2026-01-17T09:00:00' })
  @IsOptional()
  @IsString()
  startTime?: string;
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

export class ScheduleApplyDto {
  @ApiProperty({ description: 'List of session assignments to apply', type: [ScheduleAssignmentDto] })
  assignments!: ScheduleAssignmentDto[];
}
