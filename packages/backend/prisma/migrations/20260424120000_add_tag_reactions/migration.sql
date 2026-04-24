-- CreateTable
CREATE TABLE "PassengerTagReaction" (
    "id" TEXT NOT NULL,
    "passengerTagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "PassengerTagReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CarTagReaction" (
    "id" TEXT NOT NULL,
    "carTagId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "CarTagReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PassengerTagReaction_passengerTagId_idx" ON "PassengerTagReaction"("passengerTagId");

-- CreateIndex
CREATE UNIQUE INDEX "PassengerTagReaction_passengerTagId_userId_key" ON "PassengerTagReaction"("passengerTagId", "userId");

-- CreateIndex
CREATE INDEX "CarTagReaction_carTagId_idx" ON "CarTagReaction"("carTagId");

-- CreateIndex
CREATE UNIQUE INDEX "CarTagReaction_carTagId_userId_key" ON "CarTagReaction"("carTagId", "userId");

-- AddForeignKey
ALTER TABLE "PassengerTagReaction" ADD CONSTRAINT "PassengerTagReaction_passengerTagId_fkey" FOREIGN KEY ("passengerTagId") REFERENCES "PassengerTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassengerTagReaction" ADD CONSTRAINT "PassengerTagReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarTagReaction" ADD CONSTRAINT "CarTagReaction_carTagId_fkey" FOREIGN KEY ("carTagId") REFERENCES "CarTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarTagReaction" ADD CONSTRAINT "CarTagReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
