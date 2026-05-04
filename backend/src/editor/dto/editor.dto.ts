import { IsString, IsOptional, IsBoolean, IsObject, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { ContentType, ContentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * Content detail types — typed interfaces for IDE hints & documentation.
 * These are stored as Prisma Json fields, so they use InputJsonValue-compatible shapes.
 */
export interface QnaDetail {
  question?: string;
  answerQuick?: string;
  answerQuickReferenceUrl?: string;
  blocks?: Prisma.InputJsonValue; // unified: [{ type, ...data }]
}

export interface ArticleDetail {
  coverUrl?: string;
  blocks?: Prisma.InputJsonValue;
}

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

  @ApiProperty({ required: false, description: 'URL gambar thumbnail untuk card & OG image' })
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiProperty({ required: false, description: 'Thumbnail 1:1 untuk IG/FB post' })
  @IsString()
  @IsOptional()
  socialThumbnailUrl?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  useAiChecker?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  enableAudio?: boolean;

  // Polymorphic Details — typed interfaces, stored as Prisma Json
  @ApiProperty({ required: false, description: 'QNA content: question, answerQuick, dialogBlocks, dalilBlocks, analogyBlocks, tipsBlocks' })
  @IsObject()
  @IsOptional()
  qnaDetail?: QnaDetail;

  @ApiProperty({ required: false, description: 'Article/Pembelajaran content: coverUrl, blocks[]' })
  @IsObject()
  @IsOptional()
  articleDetail?: ArticleDetail;


  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ required: false, description: "POV artikel: 'ORTU' | 'ANAK' (hanya untuk type ARTICLE)" })
  @IsString()
  @IsOptional()
  pov?: string;
}
export class UpdateContentDto extends PartialType(CreateContentDto) {}
