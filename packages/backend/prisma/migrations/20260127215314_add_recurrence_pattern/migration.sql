-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "recurrencePatternId" TEXT;

-- CreateTable
CREATE TABLE "RecurrencePattern" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurrencePattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurrencePattern_groupId_idx" ON "RecurrencePattern"("groupId");

-- CreateIndex
CREATE INDEX "Session_recurrencePatternId_idx" ON "Session"("recurrencePatternId");

-- AddForeignKey
ALTER TABLE "RecurrencePattern" ADD CONSTRAINT "RecurrencePattern_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurrencePattern" ADD CONSTRAINT "RecurrencePattern_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_recurrencePatternId_fkey" FOREIGN KEY ("recurrencePatternId") REFERENCES "RecurrencePattern"("id") ON DELETE SET NULL ON UPDATE CASCADE;
