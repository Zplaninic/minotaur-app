-- CreateEnum
CREATE TYPE "enrollment_child_status" AS ENUM ('pending', 'accepted', 'rejected');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'enrollment_request_created';
ALTER TYPE "audit_action" ADD VALUE 'enrollment_request_deleted';
ALTER TYPE "audit_action" ADD VALUE 'enrollment_child_group_set';
ALTER TYPE "audit_action" ADD VALUE 'enrollment_child_accepted';
ALTER TYPE "audit_action" ADD VALUE 'enrollment_child_rejected';

-- AlterTable
ALTER TABLE "audit_event" ADD COLUMN     "enrollmentRequestId" INTEGER;

-- CreateTable
CREATE TABLE "enrollment_request" (
    "id" SERIAL NOT NULL,
    "parentName" TEXT NOT NULL,
    "parentSurname" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "rawText" TEXT,
    "guardianId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enrollment_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollment_child" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "age" DECIMAL(3,1) NOT NULL,
    "groupId" INTEGER,
    "status" "enrollment_child_status" NOT NULL DEFAULT 'pending',
    "memberId" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "enrollment_child_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrollment_request_guardianId_idx" ON "enrollment_request"("guardianId");

-- CreateIndex
CREATE INDEX "enrollment_request_createdAt_idx" ON "enrollment_request"("createdAt");

-- CreateIndex
CREATE INDEX "enrollment_child_requestId_idx" ON "enrollment_child"("requestId");

-- CreateIndex
CREATE INDEX "enrollment_child_groupId_status_idx" ON "enrollment_child"("groupId", "status");

-- CreateIndex
CREATE INDEX "enrollment_child_memberId_idx" ON "enrollment_child"("memberId");

-- CreateIndex
CREATE INDEX "audit_event_enrollmentRequestId_idx" ON "audit_event"("enrollmentRequestId");

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_enrollmentRequestId_fkey" FOREIGN KEY ("enrollmentRequestId") REFERENCES "enrollment_request"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_request" ADD CONSTRAINT "enrollment_request_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardian"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_child" ADD CONSTRAINT "enrollment_child_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "enrollment_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_child" ADD CONSTRAINT "enrollment_child_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_child" ADD CONSTRAINT "enrollment_child_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- From add_member_is_new
-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'member_new_set';

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "isNew" BOOLEAN NOT NULL DEFAULT false;

-- From add_enrollment_child_reopened
-- AlterEnum
ALTER TYPE "audit_action" ADD VALUE 'enrollment_child_reopened';

-- From add_audit_enrollment_child
-- AlterTable
ALTER TABLE "audit_event" ADD COLUMN     "enrollmentChildId" INTEGER;

-- CreateIndex
CREATE INDEX "audit_event_enrollmentChildId_idx" ON "audit_event"("enrollmentChildId");

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_enrollmentChildId_fkey" FOREIGN KEY ("enrollmentChildId") REFERENCES "enrollment_child"("id") ON DELETE SET NULL ON UPDATE CASCADE;
