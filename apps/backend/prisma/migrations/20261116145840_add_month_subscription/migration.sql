-- AlterTable
ALTER TABLE "group_month_member" ADD COLUMN     "subscriptionId" INTEGER,
ADD COLUMN     "subscriptionPrice" INTEGER,
ADD COLUMN     "subscriptionSessionsPerWeek" INTEGER;

-- CreateIndex
CREATE INDEX "group_month_member_subscriptionId_idx" ON "group_month_member"("subscriptionId");

-- AddForeignKey
ALTER TABLE "group_month_member" ADD CONSTRAINT "group_month_member_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
