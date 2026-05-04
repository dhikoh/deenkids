-- Migration: add_pov_to_content
-- Date: 2026-05-04
-- Description: Adds Point of View (POV) field to ContentItem for ARTICLE type.
--              'ORTU' = artikel untuk Orang Tua, 'ANAK' = artikel untuk Anak.
--              Nullable — existing articles unaffected (pov=NULL = semua pembaca).

ALTER TABLE "ContentItem" ADD COLUMN IF NOT EXISTS "pov" TEXT;

-- Add index for efficient filtering by type + pov (common query pattern for artikel page)
CREATE INDEX IF NOT EXISTS "ContentItem_type_pov_idx" ON "ContentItem"("type", "pov");
