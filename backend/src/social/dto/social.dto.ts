import { IsString, IsOptional, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PublishSocialDto {
  @ApiProperty({ description: 'UUID konten yang akan dipublish' })
  @IsString()
  contentId: string;

  @ApiProperty({ description: 'Platform tujuan', enum: ['INSTAGRAM', 'FACEBOOK', 'YOUTUBE', 'TIKTOK'], isArray: true })
  @IsArray()
  @IsString({ each: true })
  platforms: string[];

  @ApiProperty({ description: 'Caption final (sudah diedit user)' })
  @IsString()
  caption: string;

  @ApiProperty({ description: 'Mode publish', enum: ['IMMEDIATE', 'SCHEDULED'] })
  @IsString()
  mode: 'IMMEDIATE' | 'SCHEDULED';

  @ApiProperty({ description: 'Waktu jadwal (ISO string), wajib jika mode SCHEDULED', required: false })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class UpdateSocialDefaultsDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  defaultHashtags?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  captionTemplate?: string;
}
