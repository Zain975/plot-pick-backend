-- CreateEnum
CREATE TYPE "AccountPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountPrivacy" "AccountPrivacy" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "instagramUrl" TEXT,
ADD COLUMN     "tiktokUrl" TEXT,
ADD COLUMN     "xUrl" TEXT;
