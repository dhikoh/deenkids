-- ═══════════════════════════════════════
-- Schema Audit Migration Script
-- Run BEFORE deploying the new code
-- ═══════════════════════════════════════

-- 1. Add new enum types (idempotent — skips if already exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WithdrawalStatus') THEN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PointType') THEN
    CREATE TYPE "PointType" AS ENUM ('EARNED', 'BONUS', 'WITHDRAWAL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FeedbackType') THEN
    CREATE TYPE "FeedbackType" AS ENUM ('KRITIK', 'SARAN', 'PERTANYAAN');
  END IF;
END $$;

-- 2. Migrate WithdrawalRequest.status from String to Enum
ALTER TABLE "WithdrawalRequest"
  ALTER COLUMN "status" TYPE "WithdrawalStatus" USING "status"::"WithdrawalStatus";

-- 3. Migrate PointLedger.type from String to Enum
ALTER TABLE "PointLedger"
  ALTER COLUMN "type" TYPE "PointType" USING "type"::"PointType";

-- 4. Migrate FeedbackSubmission.type from String to Enum (uppercase existing values first)
UPDATE "FeedbackSubmission" SET "type" = UPPER("type") WHERE "type" != UPPER("type");
ALTER TABLE "FeedbackSubmission"
  ALTER COLUMN "type" TYPE "FeedbackType" USING "type"::"FeedbackType";

-- 5. Drop the orphan MediaDetail table
DROP TABLE IF EXISTS "MediaDetail";

-- 6. Add performance indexes on ContentItem
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ContentItem_authorId_status_idx" ON "ContentItem" ("authorId", "status");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ContentItem_status_type_idx" ON "ContentItem" ("status", "type");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "ContentItem_publishedAt_idx" ON "ContentItem" ("publishedAt");

-- Done!
