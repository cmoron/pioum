-- CreateTable
CREATE TABLE "GroupTag" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassengerTag" (
    "id" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "groupTagId" TEXT,
    "freeText" TEXT,

    CONSTRAINT "PassengerTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarTag" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "groupTagId" TEXT,
    "freeText" TEXT,

    CONSTRAINT "CarTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GroupTag_groupId_idx" ON "GroupTag"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupTag_groupId_label_key" ON "GroupTag"("groupId", "label");

-- CreateIndex
CREATE INDEX "PassengerTag_passengerId_idx" ON "PassengerTag"("passengerId");

-- CreateIndex
CREATE INDEX "CarTag_carId_idx" ON "CarTag"("carId");

-- AddForeignKey
ALTER TABLE "GroupTag" ADD CONSTRAINT "GroupTag_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerTag" ADD CONSTRAINT "PassengerTag_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "Passenger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerTag" ADD CONSTRAINT "PassengerTag_groupTagId_fkey" FOREIGN KEY ("groupTagId") REFERENCES "GroupTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarTag" ADD CONSTRAINT "CarTag_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarTag" ADD CONSTRAINT "CarTag_groupTagId_fkey" FOREIGN KEY ("groupTagId") REFERENCES "GroupTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
