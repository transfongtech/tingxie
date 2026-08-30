-- Existing feedback rows become successful version 1 and remain current.
DROP INDEX IF EXISTS "EssayFeedback_submissionId_key";

ALTER TABLE "EssayFeedback" ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EssayFeedback" ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "EssayFeedback" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'success';
ALTER TABLE "EssayFeedback" ADD COLUMN "engineVersion" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "EssayFeedback" ADD COLUMN "promptVersion" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "EssayFeedback" ADD COLUMN "rubricVersion" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "EssayFeedback" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "EssayFeedback" ADD COLUMN "model" TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE "EssayFeedback" ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EssayFeedback" ADD COLUMN "inputFingerprint" TEXT;
ALTER TABLE "EssayFeedback" ADD COLUMN "qualityMetadataJson" TEXT;
ALTER TABLE "EssayFeedback" ADD COLUMN "reviewResultJson" TEXT;
ALTER TABLE "EssayFeedback" ADD COLUMN "failureCode" TEXT;
ALTER TABLE "EssayFeedback" ADD COLUMN "failureMessage" TEXT;
ALTER TABLE "EssaySubmission" ADD COLUMN "reviewLeaseId" TEXT;
ALTER TABLE "EssaySubmission" ADD COLUMN "reviewLeaseExpiresAt" DATETIME;

CREATE UNIQUE INDEX "EssayFeedback_submissionId_versionNumber_key"
ON "EssayFeedback"("submissionId", "versionNumber");
CREATE INDEX "EssayFeedback_submissionId_isCurrent_status_idx"
ON "EssayFeedback"("submissionId", "isCurrent", "status");
