-- Verification source: distinguishes admin grants from paid subs and official accounts.
CREATE TYPE "VerificationSource" AS ENUM ('ADMIN', 'PAID', 'OFFICIAL');

ALTER TABLE "users" ADD COLUMN "verificationSource" "VerificationSource";

-- Backfill: existing verified users are admin grants, except the official BuzzHub account.
UPDATE "users"
SET "verificationSource" = 'OFFICIAL'
WHERE "id" = 'buzzhub-community-official';

UPDATE "users"
SET "verificationSource" = 'ADMIN'
WHERE "isVerified" = true AND "verificationSource" IS NULL;

-- Stripe subscription records: one row per user that has ever subscribed.
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_userId_key" ON "subscriptions"("userId");
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
