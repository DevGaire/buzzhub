CREATE TABLE "trending_tags" (
    "tag" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "refreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trending_tags_pkey" PRIMARY KEY ("tag")
);

CREATE INDEX "trending_tags_count_idx" ON "trending_tags"("count" DESC);
