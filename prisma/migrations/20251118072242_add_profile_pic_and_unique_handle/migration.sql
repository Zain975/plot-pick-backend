/*
  Warnings:

  - A unique constraint covering the columns `[uniqueHandle]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `uniqueHandle` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePicUrl" TEXT,
ADD COLUMN     "uniqueHandle" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_uniqueHandle_key" ON "User"("uniqueHandle");
