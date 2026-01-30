-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "avatarId" TEXT,
    "customAvatarUrl" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avatar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "Avatar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "avatarId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Car" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "userCarId" TEXT,

    CONSTRAINT "Car_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Passenger" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carId" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Passenger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ban" (
    "id" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "reason" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "liftedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT,
    "avatarId" TEXT NOT NULL,
    "defaultSeats" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_googleId_idx" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_token_idx" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- CreateIndex
CREATE INDEX "Group_inviteCode_idx" ON "Group"("inviteCode");

-- CreateIndex
CREATE INDEX "GroupMember_groupId_idx" ON "GroupMember"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMember_userId_groupId_key" ON "GroupMember"("userId", "groupId");

-- CreateIndex
CREATE INDEX "Session_groupId_date_idx" ON "Session"("groupId", "date");

-- CreateIndex
CREATE INDEX "Session_groupId_startTime_idx" ON "Session"("groupId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Session_groupId_date_key" ON "Session"("groupId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Session_groupId_startTime_key" ON "Session"("groupId", "startTime");

-- CreateIndex
CREATE INDEX "Car_sessionId_idx" ON "Car"("sessionId");

-- CreateIndex
CREATE INDEX "Car_userCarId_idx" ON "Car"("userCarId");

-- CreateIndex
CREATE UNIQUE INDEX "Car_sessionId_driverId_key" ON "Car"("sessionId", "driverId");

-- CreateIndex
CREATE INDEX "Passenger_sessionId_idx" ON "Passenger"("sessionId");

-- CreateIndex
CREATE INDEX "Passenger_carId_idx" ON "Passenger"("carId");

-- CreateIndex
CREATE UNIQUE INDEX "Passenger_sessionId_userId_key" ON "Passenger"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "Ban_giverId_receiverId_idx" ON "Ban"("giverId", "receiverId");

-- CreateIndex
CREATE INDEX "Ban_receiverId_endsAt_idx" ON "Ban"("receiverId", "endsAt");

-- CreateIndex
CREATE INDEX "UserCar_userId_idx" ON "UserCar"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_userCarId_fkey" FOREIGN KEY ("userCarId") REFERENCES "UserCar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Passenger" ADD CONSTRAINT "Passenger_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ban" ADD CONSTRAINT "Ban_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCar" ADD CONSTRAINT "UserCar_avatarId_fkey" FOREIGN KEY ("avatarId") REFERENCES "Avatar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
