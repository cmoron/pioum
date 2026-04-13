-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "enabledTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];
