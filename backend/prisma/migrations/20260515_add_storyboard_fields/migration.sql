-- AlterTable: Add storyboard video fields to ContentItem
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "storyboardVideoUrl" TEXT;
ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "storyboardMp4Url" TEXT;
