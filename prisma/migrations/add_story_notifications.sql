-- Add STORY to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE 'STORY';

-- Add storyId column to notifications table
ALTER TABLE "notifications" ADD COLUMN "storyId" TEXT;

-- Add foreign key constraint
ALTER TABLE "notifications" 
ADD CONSTRAINT "notifications_storyId_fkey" 
FOREIGN KEY ("storyId") 
REFERENCES "stories"("id") 
ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX "notifications_storyId_idx" ON "notifications"("storyId");