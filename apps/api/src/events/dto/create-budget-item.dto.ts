import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBudgetItemDto {
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
  @IsNotEmpty()
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

  @ApiPropertyOptional({ description: 'Status of the budget item', enum: ['PLANNED', 'APPROVED', 'PURCHASED', 'PAID'], default: 'PLANNED' })
  @IsString()
  @IsOptional()
  status?: 'PLANNED' | 'APPROVED' | 'PURCHASED' | 'PAID';
}
