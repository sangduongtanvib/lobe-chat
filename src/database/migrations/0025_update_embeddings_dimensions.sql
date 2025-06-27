-- Update embeddings table to support 1536 dimensions
-- This migration changes the vector column from vector(1024) to vector(1536)

-- Step 1: Clear existing embeddings data to avoid constraint conflicts
DELETE FROM embeddings;
--> statement-breakpoint

-- Step 2: Drop the old column
ALTER TABLE "embeddings" DROP COLUMN "embeddings";
--> statement-breakpoint

-- Step 3: Add new column with updated dimensions
ALTER TABLE "embeddings" ADD COLUMN "embeddings" vector(1536);
--> statement-breakpoint
