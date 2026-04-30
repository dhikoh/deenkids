-- Migration: Add PEMBELAJARAN to ContentType enum, remove MEDIA
-- Run this BEFORE deploying the new code (prisma db push)

-- Step 1: Add PEMBELAJARAN to the enum
ALTER TYPE "ContentType" ADD VALUE IF NOT EXISTS 'PEMBELAJARAN';

-- Step 2: Migrate all ARTICLE content that has nodeId to PEMBELAJARAN
UPDATE "ContentItem" SET type = 'PEMBELAJARAN'::"ContentType" WHERE type = 'ARTICLE'::"ContentType" AND "nodeId" IS NOT NULL;

-- Step 3: Migrate any MEDIA content to ARTICLE (if any exists)
-- Note: MEDIA was never used in practice, but just in case
UPDATE "ContentItem" SET type = 'ARTICLE'::"ContentType" WHERE type = 'MEDIA'::"ContentType";

-- Step 4: Verify results
-- SELECT type, COUNT(*) FROM "ContentItem" GROUP BY type;
-- Expected: QNA, ARTICLE (without nodeId), PEMBELAJARAN (with nodeId)

-- Step 5: Remove MEDIA from enum
-- Note: PostgreSQL does not support removing values from an enum directly.
-- This will be handled by prisma db push which recreates the enum.
-- If MEDIA still has references after Step 3, the push will fail.
