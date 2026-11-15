-- CreateTable
CREATE TABLE "guardian" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" SERIAL NOT NULL,
    "orgId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "birthday" DATE NOT NULL,
    "taxNumber" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_guardian" (
    "memberId" INTEGER NOT NULL,
    "guardianId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_guardian_pkey" PRIMARY KEY ("memberId","guardianId")
);

-- CreateIndex
CREATE UNIQUE INDEX "member_taxNumber_key" ON "member"("taxNumber");

-- CreateIndex
CREATE INDEX "member_orgId_idx" ON "member"("orgId");

-- CreateIndex
CREATE INDEX "member_guardian_guardianId_idx" ON "member_guardian"("guardianId");

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "org"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardian" ADD CONSTRAINT "member_guardian_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_guardian" ADD CONSTRAINT "member_guardian_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardian"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
