-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('member_created', 'member_updated', 'member_archived', 'member_role_changed', 'login_created', 'login_password_set', 'group_created', 'group_updated', 'group_archived', 'group_member_added', 'group_member_removed', 'training_session_added', 'training_session_deleted', 'month_sessions_created', 'attendance_marked', 'attendance_unmarked', 'month_member_added', 'month_member_removed', 'month_subscription_set', 'month_paid_set', 'month_comment_set', 'subscription_created', 'subscription_updated');

-- CreateTable
CREATE TABLE "audit_event" (
    "id" SERIAL NOT NULL,
    "action" "audit_action" NOT NULL,
    "actorId" INTEGER,
    "memberId" INTEGER,
    "groupId" INTEGER,
    "subscriptionId" INTEGER,
    "month" DATE,
    "date" DATE,
    "changes" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_event_createdAt_idx" ON "audit_event"("createdAt");

-- CreateIndex
CREATE INDEX "audit_event_actorId_idx" ON "audit_event"("actorId");

-- CreateIndex
CREATE INDEX "audit_event_memberId_idx" ON "audit_event"("memberId");

-- CreateIndex
CREATE INDEX "audit_event_groupId_idx" ON "audit_event"("groupId");

-- CreateIndex
CREATE INDEX "audit_event_subscriptionId_idx" ON "audit_event"("subscriptionId");

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
