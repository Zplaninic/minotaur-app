-- Every group, guardian, subscription, enrollment request and audit event now
-- belongs to one org. Existing rows take the org of the rows they hang on;
-- rows with nothing to derive it from go to the first org.

-- DropIndex
DROP INDEX "member_taxNumber_key";

-- DropIndex
DROP INDEX "subscription_name_key";

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "orgId" INTEGER;

UPDATE "group" SET "orgId" = "member"."orgId" FROM "member" WHERE "member"."id" = "group"."ownerId";

ALTER TABLE "group" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "guardian" ADD COLUMN     "orgId" INTEGER;

UPDATE "guardian" SET "orgId" = COALESCE(
  (
    SELECT min("member"."orgId")
    FROM "member_guardian"
    JOIN "member" ON "member"."id" = "member_guardian"."memberId"
    WHERE "member_guardian"."guardianId" = "guardian"."id"
  ),
  (SELECT min("id") FROM "org")
);

-- A guardian of members in several orgs becomes one guardian per org.
DO $$
DECLARE
  link RECORD;
  copy_id INTEGER;
BEGIN
  FOR link IN
    SELECT DISTINCT "member_guardian"."guardianId", "member"."orgId"
    FROM "member_guardian"
    JOIN "member" ON "member"."id" = "member_guardian"."memberId"
    JOIN "guardian" ON "guardian"."id" = "member_guardian"."guardianId"
    WHERE "member"."orgId" <> "guardian"."orgId"
  LOOP
    INSERT INTO "guardian" ("orgId", "name", "surname", "email", "phone", "createdAt", "updatedAt")
    SELECT link."orgId", "name", "surname", "email", "phone", "createdAt", "updatedAt"
    FROM "guardian"
    WHERE "id" = link."guardianId"
    RETURNING "id" INTO copy_id;

    UPDATE "member_guardian" SET "guardianId" = copy_id
    FROM "member"
    WHERE "member"."id" = "member_guardian"."memberId"
      AND "member_guardian"."guardianId" = link."guardianId"
      AND "member"."orgId" = link."orgId";
  END LOOP;
END $$;

ALTER TABLE "guardian" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "enrollment_request" ADD COLUMN     "orgId" INTEGER;

UPDATE "enrollment_request" SET "orgId" = COALESCE(
  (SELECT "guardian"."orgId" FROM "guardian" WHERE "guardian"."id" = "enrollment_request"."guardianId"),
  (
    SELECT min("member"."orgId")
    FROM "enrollment_child"
    JOIN "member" ON "member"."id" = "enrollment_child"."memberId"
    WHERE "enrollment_child"."requestId" = "enrollment_request"."id"
  ),
  (SELECT min("id") FROM "org")
);

ALTER TABLE "enrollment_request" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "subscription" ADD COLUMN     "orgId" INTEGER;

UPDATE "subscription" SET "orgId" = (SELECT min("id") FROM "org");

ALTER TABLE "subscription" ALTER COLUMN "orgId" SET NOT NULL;

-- AlterTable
ALTER TABLE "audit_event" ADD COLUMN     "orgId" INTEGER;

UPDATE "audit_event" SET "orgId" = COALESCE(
  (SELECT "member"."orgId" FROM "member" WHERE "member"."id" = "audit_event"."actorId"),
  (SELECT "member"."orgId" FROM "member" WHERE "member"."id" = "audit_event"."memberId"),
  (SELECT "group"."orgId" FROM "group" WHERE "group"."id" = "audit_event"."groupId"),
  (SELECT min("id") FROM "org")
);

ALTER TABLE "audit_event" ALTER COLUMN "orgId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "audit_event_orgId_idx" ON "audit_event"("orgId");

-- CreateIndex
CREATE INDEX "enrollment_request_orgId_idx" ON "enrollment_request"("orgId");

-- CreateIndex
CREATE INDEX "group_orgId_idx" ON "group"("orgId");

-- CreateIndex
CREATE INDEX "guardian_orgId_idx" ON "guardian"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "member_orgId_taxNumber_key" ON "member"("orgId", "taxNumber") WHERE ("deletedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "subscription_orgId_name_key" ON "subscription"("orgId", "name");

-- AddForeignKey
ALTER TABLE "guardian" ADD CONSTRAINT "guardian_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_request" ADD CONSTRAINT "enrollment_request_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
