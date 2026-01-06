-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DRIVER_LICENSE', 'PASSPORT', 'STATE_ID');

-- CreateEnum
CREATE TYPE "AccountPrivacy" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('KYC_PENDING', 'ACTIVE', 'LOCKED');

-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('EMAIL_VERIFICATION', 'PHONE_VERIFICATION', 'LOGIN_EMAIL', 'LOGIN_PHONE');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "PlotType" AS ENUM ('BASIC_PLOT', 'PLOT_DROP', 'INFLUENCER_DROP');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('YES_NO', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "PlotStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PAUSED', 'RESULTS_ANNOUNCED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "uniqueHandle" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "last4Ssn" VARCHAR(4),
    "profilePicUrl" TEXT,
    "userImage" TEXT,
    "accountPrivacy" "AccountPrivacy" NOT NULL DEFAULT 'PUBLIC',
    "xUrl" TEXT,
    "instagramUrl" TEXT,
    "tiktokUrl" TEXT,
    "documentType" "DocumentType",
    "documentFrontUrl" TEXT,
    "documentBackUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "identityVerifiedAt" TIMESTAMP(3),
    "signupStep" INTEGER NOT NULL DEFAULT 0,
    "status" "UserStatus" NOT NULL DEFAULT 'KYC_PENDING',
    "plotPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "mediaUrls" TEXT[],
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "commentsCount" INTEGER NOT NULL DEFAULT 0,
    "sharesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "parentCommentId" TEXT,
    "content" TEXT NOT NULL,
    "likesCount" INTEGER NOT NULL DEFAULT 0,
    "repliesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentLike" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostShare" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Show" (
    "id" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "title" TEXT NOT NULL,
    "seasonNumber" INTEGER NOT NULL,
    "description" TEXT,
    "minimumAmount" DECIMAL(10,2) NOT NULL,
    "maximumAmount" DECIMAL(10,2) NOT NULL,
    "payoutAmount" DECIMAL(10,2) NOT NULL,
    "plotpicksVig" DECIMAL(5,2) NOT NULL,
    "bonusKicker" BOOLEAN NOT NULL DEFAULT false,
    "bonusAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Show_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "showId" TEXT NOT NULL,
    "episodeNumber" INTEGER NOT NULL,
    "type" "PlotType" NOT NULL,
    "numberOfQuestions" INTEGER NOT NULL,
    "activeStartDate" TIMESTAMP(3) NOT NULL,
    "activeStartTime" VARCHAR(10) NOT NULL,
    "closeEndDate" TIMESTAMP(3) NOT NULL,
    "closeEndTime" VARCHAR(10) NOT NULL,
    "status" "PlotStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "order" INTEGER NOT NULL,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "correctOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlotPrediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "predictedAmount" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlotPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPrediction" (
    "id" TEXT NOT NULL,
    "plotPredictionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_uniqueHandle_key" ON "User"("uniqueHandle");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_email_key" ON "Admin"("email");

-- CreateIndex
CREATE INDEX "Otp_userId_type_verifiedAt_idx" ON "Otp"("userId", "type", "verifiedAt");

-- CreateIndex
CREATE INDEX "Otp_adminId_type_verifiedAt_idx" ON "Otp"("adminId", "type", "verifiedAt");

-- CreateIndex
CREATE INDEX "Otp_code_expiresAt_idx" ON "Otp"("code", "expiresAt");

-- CreateIndex
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_parentCommentId_idx" ON "Comment"("parentCommentId");

-- CreateIndex
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");

-- CreateIndex
CREATE INDEX "PostLike_postId_idx" ON "PostLike"("postId");

-- CreateIndex
CREATE INDEX "PostLike_userId_idx" ON "PostLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");

-- CreateIndex
CREATE INDEX "CommentLike_userId_idx" ON "CommentLike"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentLike_commentId_userId_key" ON "CommentLike"("commentId", "userId");

-- CreateIndex
CREATE INDEX "PostShare_postId_idx" ON "PostShare"("postId");

-- CreateIndex
CREATE INDEX "PostShare_userId_idx" ON "PostShare"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PostShare_postId_userId_key" ON "PostShare"("postId", "userId");

-- CreateIndex
CREATE INDEX "Follow_followerId_idx" ON "Follow"("followerId");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_followerId_followingId_key" ON "Follow"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "Show_title_seasonNumber_idx" ON "Show"("title", "seasonNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Show_title_seasonNumber_key" ON "Show"("title", "seasonNumber");

-- CreateIndex
CREATE INDEX "Plot_showId_idx" ON "Plot"("showId");

-- CreateIndex
CREATE INDEX "Plot_status_idx" ON "Plot"("status");

-- CreateIndex
CREATE INDEX "Plot_activeStartDate_closeEndDate_idx" ON "Plot"("activeStartDate", "closeEndDate");

-- CreateIndex
CREATE INDEX "Plot_showId_episodeNumber_idx" ON "Plot"("showId", "episodeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Plot_showId_episodeNumber_key" ON "Plot"("showId", "episodeNumber");

-- CreateIndex
CREATE INDEX "Question_plotId_order_idx" ON "Question"("plotId", "order");

-- CreateIndex
CREATE INDEX "Question_isPaused_idx" ON "Question"("isPaused");

-- CreateIndex
CREATE INDEX "QuestionOption_questionId_order_idx" ON "QuestionOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "PlotPrediction_userId_idx" ON "PlotPrediction"("userId");

-- CreateIndex
CREATE INDEX "PlotPrediction_plotId_idx" ON "PlotPrediction"("plotId");

-- CreateIndex
CREATE INDEX "PlotPrediction_createdAt_idx" ON "PlotPrediction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlotPrediction_userId_plotId_key" ON "PlotPrediction"("userId", "plotId");

-- CreateIndex
CREATE INDEX "QuestionPrediction_plotPredictionId_idx" ON "QuestionPrediction"("plotPredictionId");

-- CreateIndex
CREATE INDEX "QuestionPrediction_questionId_idx" ON "QuestionPrediction"("questionId");

-- CreateIndex
CREATE INDEX "QuestionPrediction_optionId_idx" ON "QuestionPrediction"("optionId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPrediction_plotPredictionId_questionId_key" ON "QuestionPrediction"("plotPredictionId", "questionId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommentLike" ADD CONSTRAINT "CommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostShare" ADD CONSTRAINT "PostShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plot" ADD CONSTRAINT "Plot_showId_fkey" FOREIGN KEY ("showId") REFERENCES "Show"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_correctOptionId_fkey" FOREIGN KEY ("correctOptionId") REFERENCES "QuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPrediction" ADD CONSTRAINT "PlotPrediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPrediction" ADD CONSTRAINT "PlotPrediction_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPrediction" ADD CONSTRAINT "QuestionPrediction_plotPredictionId_fkey" FOREIGN KEY ("plotPredictionId") REFERENCES "PlotPrediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPrediction" ADD CONSTRAINT "QuestionPrediction_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPrediction" ADD CONSTRAINT "QuestionPrediction_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "QuestionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
