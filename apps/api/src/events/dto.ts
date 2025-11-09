import { IsInt, IsNotEmpty, IsOptional, IsString, IsDateString, IsNumberString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty() @IsInt() organizerId!: number;
  @ApiProperty() @IsString() @IsNotEmpty() title!: string;
  @ApiProperty() @IsDateString() startDate!: string;
  @ApiProperty() @IsDateString() endDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() expectedAudience?: number;
  @ApiPropertyOptional({ example: "500000.00" }) @IsOptional() @IsNumberString() budget?: string;
  @ApiPropertyOptional({ description: "Free text brief to be parsed by AI" }) @IsOptional() @IsString() brief?: string;
}
