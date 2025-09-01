-- CreateEnum
CREATE TYPE "StoryPrivacy" AS ENUM ('PUBLIC', 'FOLLOWERS', 'CLOSE_FRIENDS');

-- AlterTable
ALTER TABLE "stories" ADD COLUMN     "privacy" "StoryPrivacy" NOT NULL DEFAULT 'FOLLOWERS';

-- CreateTable
CREATE TABLE "story_highlights" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coverMediaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "highlight_items" (
    "id" TEXT NOT NULL,
    "highlightId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "highlight_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "story_highlights_userId_idx" ON "story_highlights"("userId");

-- CreateIndex
CREATE INDEX "highlight_items_highlightId_idx" ON "highlight_items"("highlightId");

-- CreateIndex
CREATE UNIQUE INDEX "highlight_items_highlightId_storyId_key" ON "highlight_items"("highlightId", "storyId");

-- CreateIndex
CREATE INDEX "stories_privacy_idx" ON "stories"("privacy");

-- AddForeignKey
ALTER TABLE "story_highlights" ADD CONSTRAINT "story_highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_highlights" ADD CONSTRAINT "story_highlights_coverMediaId_fkey" FOREIGN KEY ("coverMediaId") REFERENCES "post_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight_items" ADD CONSTRAINT "highlight_items_highlightId_fkey" FOREIGN KEY ("highlightId") REFERENCES "story_highlights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "highlight_items" ADD CONSTRAINT "highlight_items_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
