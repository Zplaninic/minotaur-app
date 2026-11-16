-- DropIndex
DROP INDEX "member_login_email_key";

-- DropIndex
DROP INDEX "member_taxNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "member_login_email_key" ON "member"("email") WHERE ((role = ANY (ARRAY['trainer'::member_role, 'admin'::member_role])) AND ("deletedAt" IS NULL));

-- CreateIndex
CREATE UNIQUE INDEX "member_taxNumber_key" ON "member"("taxNumber") WHERE ("deletedAt" IS NULL);
