-- AlterTable
ALTER TABLE "ErrorReport" ADD COLUMN IF NOT EXISTS "category" VARCHAR(50) NOT NULL DEFAULT 'JS_ERROR';
ALTER TABLE "ErrorReport" ADD COLUMN IF NOT EXISTS "httpStatus" INTEGER;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ErrorReport_category_idx" ON "ErrorReport"("category");
