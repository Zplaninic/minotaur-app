-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('child', 'member', 'trainer', 'admin');

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "role" "member_role" NOT NULL DEFAULT 'child';

-- CreateTable
CREATE TABLE "login" (
    "memberId" INTEGER NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "login_pkey" PRIMARY KEY ("memberId")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "memberId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_memberId_idx" ON "session"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "member_login_email_key" ON "member"("email") WHERE (role IN ('trainer', 'admin'));

-- AddForeignKey
ALTER TABLE "login" ADD CONSTRAINT "login_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Emails are stored lowercase from now on; bring existing rows in line.
UPDATE "member" SET "email" = lower(trim("email")) WHERE "email" IS NOT NULL;
