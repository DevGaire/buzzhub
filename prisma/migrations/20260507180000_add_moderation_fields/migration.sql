-- User suspension fields. NULL = active.
ALTER TABLE "users"
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

-- Soft-delete for posts. NULL = visible.
ALTER TABLE "posts"
  ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE INDEX "posts_deletedAt_idx" ON "posts"("deletedAt");

-- Report resolution audit fields.
ALTER TABLE "reports"
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "resolvedById" TEXT;

CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");
