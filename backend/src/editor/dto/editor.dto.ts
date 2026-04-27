import { IsString, IsOptional, IsBoolean, IsObject, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentType, ContentStatus } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: ContentType })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiProperty({ enum: ContentStatus })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiProperty()
  @IsString()
  nodeId: string;

  @ApiProperty()
  @IsString()
  ageGroup: string;

  @ApiProperty()
  @IsOptional()
  metaTitle?: string;

  @ApiProperty()
  @IsOptional()
  metaDesc?: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  useAiChecker?: boolean;

  // Polymorphic Details based on type
  @ApiProperty()
  @IsObject()
  @IsOptional()
  qnaDetail?: any;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  articleDetail?: any;

  @ApiProperty()
  @IsObject()
  @IsOptional()
  mediaDetail?: any;
}

export class UpdateContentDto extends CreateContentDto {}
