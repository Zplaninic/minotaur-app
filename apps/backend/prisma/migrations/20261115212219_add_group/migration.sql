-- CreateEnum
CREATE TYPE "weekday" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- CreateTable
CREATE TABLE "group" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER NOT NULL,
    "days" "weekday"[],
    "from" TIME(0) NOT NULL,
    "to" TIME(0) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_ownerId_idx" ON "group"("ownerId");

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
