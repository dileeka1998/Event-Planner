import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ description: 'Name of the venue' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Address of the venue' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ description: 'Capacity of the venue' })
  @IsNumber()
  capacity!: number;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ description: 'Contact phone' })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiPropertyOptional({ description: 'Hourly rate in LKR' })
  @IsString()
  @IsOptional()
  hourlyRate?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

