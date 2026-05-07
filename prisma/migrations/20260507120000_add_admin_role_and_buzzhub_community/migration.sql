-- Add isAdmin flag for creators who can grant verification badges manually.
ALTER TABLE "users" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Seed the official BuzzHub Community account (verified, non-admin).
-- Idempotent: skips insert if the username/id is already present.
INSERT INTO "users" (
  "id",
  "username",
  "displayName",
  "email",
  "bio",
  "isVerified",
  "isAdmin",
  "createdAt"
)
VALUES (
  'buzzhub-community-official',
  'buzzhub',
  'BuzzHub Community',
  'community@buzzhub.app',
  'The official BuzzHub account. Updates, announcements, community highlights.',
  true,
  false,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;
