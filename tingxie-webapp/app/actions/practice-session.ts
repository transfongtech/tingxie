"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/server-utils";

export async function runLazyEvaluationFallback() {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.practiceSession.updateMany({
      where: {
        status: "pending_review",
        startedAt: { lte: cutoff },
      },
      data: {
        status: "skipped",
      },
    });
  } catch (error) {
    console.error("Lazy evaluation fallback error:", error);
  }
}

export async function createPracticeSession(data: {
  language: "zh" | "en";
  weekId?: number;
  wordIds: number[];
}) {
  try {
    const isChinese = data.language === "zh";
    const status = isChinese ? "pending_review" : "completed";

    const session = await prisma.practiceSession.create({
      data: {
        language: data.language,
        weekId: data.weekId || null,
        status: status,
        completedAt: new Date(),
        results: {
          create: data.wordIds.map((id) => ({
            wordId: id,
            outcome: isChinese ? null : "correct",
            markedBy: isChinese ? null : "system",
            markedAt: new Date(),
          })),
        },
      },
    });

    safeRevalidatePath("/manage/review");
    safeRevalidatePath("/");
    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error("createPracticeSession error:", error);
    return { success: false, error: "创建练习记录失败" };
  }
}

export async function getPendingReviews() {
  await runLazyEvaluationFallback();

  try {
    const sessions = await prisma.practiceSession.findMany({
      where: {
        status: "pending_review",
      },
      include: {
        week: true,
        results: {
          include: {
            word: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
    });

    return { success: true, sessions };
  } catch (error) {
    console.error("getPendingReviews error:", error);
    return { success: false, error: "获取待批改练习失败" };
  }
}

export async function submitParentReview(
  sessionId: number,
  results: { wordId: number; isCorrect: boolean }[]
) {
  try {
    for (const res of results) {
      await prisma.practiceResult.updateMany({
        where: {
          sessionId,
          wordId: res.wordId,
        },
        data: {
          outcome: res.isCorrect ? "correct" : "wrong",
          markedBy: "parent",
          markedAt: new Date(),
        },
      });

      const now = new Date();
      const existing = await prisma.learningProgress.findUnique({
        where: { wordId: res.wordId },
      });

      let newStage = existing ? existing.stage : 0;
      let isMastered = existing ? existing.isMastered : false;

      if (res.isCorrect) {
        const intervals = [1, 2, 4, 7, 15, 30];
        newStage = Math.min(newStage + 1, intervals.length);
        if (newStage >= 4) isMastered = true;
        const daysToAdd = intervals[newStage - 1] || 1;
        const nextReview = new Date();
        nextReview.setDate(nextReview.getDate() + daysToAdd);

        await prisma.learningProgress.upsert({
          where: { wordId: res.wordId },
          update: {
            stage: newStage,
            lastReviewDate: now,
            nextReviewDate: nextReview,
            isMastered,
          },
          create: {
            wordId: res.wordId,
            stage: newStage,
            lastReviewDate: now,
            nextReviewDate: nextReview,
            isMastered,
          },
        });
      } else {
        newStage = 0;
        await prisma.learningProgress.upsert({
          where: { wordId: res.wordId },
          update: {
            stage: 0,
            lastReviewDate: now,
            nextReviewDate: now,
            isMastered: false,
          },
          create: {
            wordId: res.wordId,
            stage: 0,
            lastReviewDate: now,
            nextReviewDate: now,
            isMastered: false,
          },
        });
      }
    }

    await prisma.practiceSession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });

    safeRevalidatePath("/manage/review");
    safeRevalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("submitParentReview error:", error);
    return { success: false, error: "提交批改失败" };
  }
}
