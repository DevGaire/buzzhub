-- CreateTable
CREATE TABLE "stories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "story_media" (
    "storyId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "story_media_pkey" PRIMARY KEY ("storyId","mediaId")
);

-- CreateIndex
CREATE INDEX "stories_userId_expiresAt_idx" ON "stories"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_media" ADD CONSTRAINT "story_media_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_media" ADD CONSTRAINT "story_media_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "post_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
