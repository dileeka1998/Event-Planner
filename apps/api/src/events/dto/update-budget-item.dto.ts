import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateBudgetItemDto {
  @ApiPropertyOptional({ description: 'Category of the budget item' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Description of the budget item' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Estimated amount in LKR' })
  @IsString()
  @IsOptional()
  estimatedAmount?: string;

  @ApiPropertyOptional({ description: 'Actual amount in LKR' })
  @IsString()
  @IsOptional()
  actualAmount?: string;

  @ApiPropertyOptional({ description: 'Quantity' })
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

  @ApiPropertyOptional({ description: 'Status of the budget item', enum: ['PLANNED', 'APPROVED', 'PURCHASED', 'PAID'] })
  @IsString()
  @IsOptional()
  status?: 'PLANNED' | 'APPROVED' | 'PURCHASED' | 'PAID';
}
