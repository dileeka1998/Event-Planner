import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123token...' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'newpassword123' })
  @IsString()
  @MinLength(6)
  confirmPassword!: string;
}
