import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty, IsDateString, Min, IsIn } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ description: 'The title of the session' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional({ description: 'The name of the speaker' })
  @IsString()
  @IsOptional()
  speaker?: string;

  @ApiProperty({ description: 'Duration of the session in minutes', default: 60 })
  @IsNumber()
  @Min(1)
  durationMin!: number;

  @ApiPropertyOptional({ description: 'Start time of the session (ISO datetime string)' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'The ID of the room where the session will be held' })
  @IsNumber()
  @IsOptional()
  roomId?: number;

  @ApiProperty({ 
    description: 'Topic/category of the session',
    enum: ['Technology', 'Development', 'Design', 'Data', 'Security', 'General'],
    default: 'General'
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['Technology', 'Development', 'Design', 'Data', 'Security', 'General'])
  topic!: string;
}
