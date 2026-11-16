-- AlterTable
ALTER TABLE "group" ADD COLUMN     "deletedAt" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "member" ADD COLUMN     "deletedAt" TIMESTAMPTZ;
