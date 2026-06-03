-- AlterTable
ALTER TABLE "Avatar" ADD COLUMN     "mimeType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';
