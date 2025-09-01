-- Create story highlights table
CREATE TABLE "story_highlights" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "story_highlights_userId_fkey" FOREIGN KEY ("userId") 
        REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "story_highlights_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") 
        REFERENCES "post_media"("id") ON DELETE SET NULL
);

-- Create highlight items table (stories saved to highlights)
CREATE TABLE "highlight_items" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "highlightId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "highlight_items_highlightId_fkey" FOREIGN KEY ("highlightId") 
        REFERENCES "story_highlights"("id") ON DELETE CASCADE,
    CONSTRAINT "highlight_items_storyId_fkey" FOREIGN KEY ("storyId") 
        REFERENCES "stories"("id") ON DELETE CASCADE,
    
    UNIQUE("highlightId", "storyId")
);

-- Add privacy settings to stories
ALTER TABLE "stories" ADD COLUMN "privacy" TEXT NOT NULL DEFAULT 'FOLLOWERS';

-- Create indexes
CREATE INDEX "story_highlights_userId_idx" ON "story_highlights"("userId");
CREATE INDEX "highlight_items_highlightId_idx" ON "highlight_items"("highlightId");
CREATE INDEX "stories_privacy_idx" ON "stories"("privacy");