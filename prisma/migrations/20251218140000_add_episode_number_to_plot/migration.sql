-- AlterTable: Remove episode column from Show (if it exists)
ALTER TABLE "Show" DROP COLUMN IF EXISTS "episode";

-- AlterTable: Add episodeNumber to Plot
-- First, add the column as nullable
ALTER TABLE "Plot" ADD COLUMN IF NOT EXISTS "episodeNumber" INTEGER;

-- Update existing Plot records to have episodeNumber = 1 (if any exist)
UPDATE "Plot" SET "episodeNumber" = 1 WHERE "episodeNumber" IS NULL;

-- Now make it NOT NULL with default
ALTER TABLE "Plot" ALTER COLUMN "episodeNumber" SET NOT NULL;
ALTER TABLE "Plot" ALTER COLUMN "episodeNumber" SET DEFAULT 1;

-- CreateIndex: Unique constraint for showId + episodeNumber
CREATE UNIQUE INDEX IF NOT EXISTS "Plot_showId_episodeNumber_key" ON "Plot"("showId", "episodeNumber");

-- CreateIndex: Index for showId + episodeNumber
CREATE INDEX IF NOT EXISTS "Plot_showId_episodeNumber_idx" ON "Plot"("showId", "episodeNumber");

-- CreateIndex: Unique constraint for Show title + seasonNumber
CREATE UNIQUE INDEX IF NOT EXISTS "Show_title_seasonNumber_key" ON "Show"("title", "seasonNumber");
