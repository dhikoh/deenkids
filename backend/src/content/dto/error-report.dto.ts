import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitErrorReportDto {
  @ApiProperty({ description: 'Error message', maxLength: 1000 })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  message: string;

  @ApiPropertyOptional({ description: 'Stack trace', maxLength: 5000 })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  stack?: string;

  @ApiPropertyOptional({ description: 'Source URL where error occurred', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  source?: string;

  @ApiPropertyOptional({ description: 'User agent string', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  userAgent?: string;

  @ApiPropertyOptional({ description: 'User ID if authenticated', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;
}
