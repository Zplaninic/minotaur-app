-- CreateTable
CREATE TABLE "member_month" (
    "memberId" INTEGER NOT NULL,
    "month" DATE NOT NULL,
    "subscriptionId" INTEGER,
    "subscriptionPrice" INTEGER,
    "subscriptionSessionsPerWeek" INTEGER,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_month_pkey" PRIMARY KEY ("memberId","month")
);

-- Copy the per-group values: one row per member and month. A row with a
-- subscription wins over one without, then the lowest group id. Paid only
-- with a subscription, and if any group had it paid.
INSERT INTO "member_month" ("memberId", "month", "subscriptionId", "subscriptionPrice", "subscriptionSessionsPerWeek", "paid", "updatedAt")
SELECT DISTINCT ON ("memberId", "month")
    "memberId",
    "month",
    "subscriptionId",
    "subscriptionPrice",
    "subscriptionSessionsPerWeek",
    CASE
        WHEN "subscriptionId" IS NULL THEN false
        ELSE bool_or("paid" AND "subscriptionId" IS NOT NULL) OVER (PARTITION BY "memberId", "month")
    END,
    CURRENT_TIMESTAMP
FROM "group_month_member"
ORDER BY "memberId", "month", ("subscriptionId" IS NULL), "groupId";

-- DropForeignKey
ALTER TABLE "group_month_member" DROP CONSTRAINT "group_month_member_subscriptionId_fkey";

-- DropIndex
DROP INDEX "group_month_member_memberId_idx";

-- DropIndex
DROP INDEX "group_month_member_subscriptionId_idx";

-- AlterTable
ALTER TABLE "group_month_member" DROP COLUMN "paid",
DROP COLUMN "subscriptionId",
DROP COLUMN "subscriptionPrice",
DROP COLUMN "subscriptionSessionsPerWeek";

-- CreateIndex
CREATE INDEX "member_month_subscriptionId_idx" ON "member_month"("subscriptionId");

-- CreateIndex
CREATE INDEX "group_month_member_memberId_month_idx" ON "group_month_member"("memberId", "month");

-- AddForeignKey
ALTER TABLE "group_month_member" ADD CONSTRAINT "group_month_member_memberId_month_fkey" FOREIGN KEY ("memberId", "month") REFERENCES "member_month"("memberId", "month") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_month" ADD CONSTRAINT "member_month_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_month" ADD CONSTRAINT "member_month_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
