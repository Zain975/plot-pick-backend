/*
  Warnings:

  - You are about to drop the column `idDocumentBackUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `idDocumentFrontUrl` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `idDocumentType` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVER_LICENSE', 'PASSPORT', 'STATE_ID');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "idDocumentBackUrl",
DROP COLUMN "idDocumentFrontUrl",
DROP COLUMN "idDocumentType",
ADD COLUMN     "documentBackUrl" TEXT,
ADD COLUMN     "documentFrontUrl" TEXT,
ADD COLUMN     "documentType" "DocumentType";

-- DropEnum
DROP TYPE "IdDocumentType";
