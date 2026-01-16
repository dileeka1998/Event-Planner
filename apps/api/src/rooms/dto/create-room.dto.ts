import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty, Min } from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ description: 'The name of the room' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'The capacity of the room' })
  @IsNumber()
  @Min(1)
  capacity!: number;
}
