import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
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

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  nodeId?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ageGroups?: string[];

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  displayAuthorName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  metaDesc?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  useAiChecker?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enableAudio?: boolean;

  // Polymorphic Details based on type
  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  qnaDetail?: any;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  articleDetail?: any;

  @ApiProperty({ required: false })
  @IsObject()
  @IsOptional()
  mediaDetail?: any;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}

export class UpdateContentDto extends PartialType(CreateContentDto) {}
