-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'STORY';

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "storyId" TEXT;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
