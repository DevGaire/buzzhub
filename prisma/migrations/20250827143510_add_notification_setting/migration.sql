-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTION';

-- CreateTable
CREATE TABLE "notification_settings" (
    "userId" TEXT NOT NULL,
    "emailLikes" BOOLEAN NOT NULL DEFAULT true,
    "emailComments" BOOLEAN NOT NULL DEFAULT true,
    "emailFollows" BOOLEAN NOT NULL DEFAULT true,
    "emailMentions" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
