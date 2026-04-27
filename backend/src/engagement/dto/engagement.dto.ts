import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ToggleEngagementDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userHash: string;
}

export class SubmitRatingDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userHash: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
