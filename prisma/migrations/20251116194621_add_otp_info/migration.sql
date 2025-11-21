-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'LOGIN_EMAIL', 'LOGIN_PHONE');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "adminId" TEXT,
    "code" VARCHAR(6) NOT NULL,
    "type" "OtpType" NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Otp_userId_type_verifiedAt_idx" ON "Otp"("userId", "type", "verifiedAt");

-- CreateIndex
CREATE INDEX "Otp_adminId_type_verifiedAt_idx" ON "Otp"("adminId", "type", "verifiedAt");

-- CreateIndex
CREATE INDEX "Otp_code_expiresAt_idx" ON "Otp"("code", "expiresAt");
