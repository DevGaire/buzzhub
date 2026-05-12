-- AlterTable: backfill Follow.createdAt for existing rows; future inserts use DEFAULT.
ALTER TABLE "follows" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "follows_followingId_createdAt_idx" ON "follows"("followingId", "createdAt");

-- CreateTable
CREATE TABLE "post_impressions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_impressions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "post_impressions_postId_createdAt_idx" ON "post_impressions"("postId", "createdAt");
CREATE INDEX "post_impressions_viewerId_idx" ON "post_impressions"("viewerId");

-- AddForeignKey
ALTER TABLE "post_impressions" ADD CONSTRAINT "post_impressions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
