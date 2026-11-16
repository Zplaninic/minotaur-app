-- CreateTable
CREATE TABLE "training_session" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "sessionId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("sessionId","memberId")
);

-- CreateTable
CREATE TABLE "group_month_member" (
    "groupId" INTEGER NOT NULL,
    "month" DATE NOT NULL,
    "memberId" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_month_member_pkey" PRIMARY KEY ("groupId","month","memberId")
);

-- CreateIndex
CREATE UNIQUE INDEX "training_session_groupId_date_key" ON "training_session"("groupId", "date");

-- CreateIndex
CREATE INDEX "attendance_memberId_idx" ON "attendance"("memberId");

-- CreateIndex
CREATE INDEX "group_month_member_memberId_idx" ON "group_month_member"("memberId");

-- AddForeignKey
ALTER TABLE "training_session" ADD CONSTRAINT "training_session_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_month_member" ADD CONSTRAINT "group_month_member_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_month_member" ADD CONSTRAINT "group_month_member_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
