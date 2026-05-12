-- AlterEnum
ALTER TYPE "PostStatus" ADD VALUE 'SCHEDULED';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN "scheduledFor" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "posts_status_scheduledFor_idx" ON "posts"("status", "scheduledFor");
