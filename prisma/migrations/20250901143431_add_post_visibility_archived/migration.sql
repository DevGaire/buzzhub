-- CreateEnum
CREATE TYPE "PostVisibility" AS ENUM ('PUBLIC', 'FOLLOWERS', 'ONLY_ME');

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "visibility" "PostVisibility" NOT NULL DEFAULT 'PUBLIC';
