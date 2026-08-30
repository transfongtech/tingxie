-- CreateTable
CREATE TABLE "Week" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "number" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "grade" INTEGER NOT NULL DEFAULT 3,
    "term" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME,
    "dictationDate" DATETIME
);

-- CreateTable
CREATE TABLE "Word" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "syllableData" TEXT
);

-- CreateTable
CREATE TABLE "WordList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    CONSTRAINT "WordList_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WordList_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL,
    "reviewDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "outcome" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    CONSTRAINT "ReviewLog_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "wordId" INTEGER NOT NULL,
    "nextReviewDate" DATETIME NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "lastReviewDate" DATETIME,
    "isMastered" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LearningProgress_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeSession" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "language" TEXT NOT NULL,
    "weekId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PracticeSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PracticeResult" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sessionId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "outcome" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "markedBy" TEXT,
    "markedAt" DATETIME,
    CONSTRAINT "PracticeResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PracticeSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PracticeResult_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DailyStreak" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" TEXT NOT NULL,
    "practiced" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" TEXT NOT NULL,
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" TEXT
);

-- CreateTable
CREATE TABLE "EssayPrompt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "EssayPromptImage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promptId" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "originalPath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EssayPromptImage_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EssayPrompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EssayDraft" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promptId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EssayDraft_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EssayPrompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EssaySubmission" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "promptId" INTEGER NOT NULL,
    "essayText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EssaySubmission_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "EssayPrompt" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EssayFeedback" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "submissionId" INTEGER NOT NULL,
    "annotations" TEXT NOT NULL,
    "polishedText" TEXT NOT NULL,
    "contentScore" INTEGER NOT NULL,
    "languageScore" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "spellingErrors" INTEGER NOT NULL DEFAULT 0,
    "grammarErrors" INTEGER NOT NULL DEFAULT 0,
    "structureErrors" INTEGER NOT NULL DEFAULT 0,
    "vocabSuggestions" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "summaryAudioPath" TEXT,
    "spellingErrorWords" TEXT,
    "contentBreakdownJson" TEXT,
    "languageBreakdownJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EssayFeedback_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "EssaySubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Phrase" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Week_number_language_grade_term_key" ON "Week"("number", "language", "grade", "term");

-- CreateIndex
CREATE UNIQUE INDEX "Word_content_key" ON "Word"("content");

-- CreateIndex
CREATE UNIQUE INDEX "WordList_weekId_wordId_key" ON "WordList"("weekId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_wordId_key" ON "LearningProgress"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStreak_date_key" ON "DailyStreak"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EssayDraft_promptId_key" ON "EssayDraft"("promptId");

-- CreateIndex
CREATE UNIQUE INDEX "EssayFeedback_submissionId_key" ON "EssayFeedback"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Phrase_content_language_key" ON "Phrase"("content", "language");

