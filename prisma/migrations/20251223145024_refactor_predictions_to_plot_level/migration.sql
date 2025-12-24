/*
  Warnings:

  - You are about to drop the `Prediction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_optionId_fkey";

-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_questionId_fkey";

-- DropForeignKey
ALTER TABLE "Prediction" DROP CONSTRAINT "Prediction_userId_fkey";

-- AlterTable
ALTER TABLE "Plot" ALTER COLUMN "episodeNumber" DROP DEFAULT;

-- DropTable
DROP TABLE "Prediction";

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

-- CreateIndex
CREATE INDEX "Show_title_seasonNumber_idx" ON "Show"("title", "seasonNumber");

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
