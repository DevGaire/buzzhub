-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(60) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notes_userId_expiresAt_idx" ON "notes"("userId", "expiresAt");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
