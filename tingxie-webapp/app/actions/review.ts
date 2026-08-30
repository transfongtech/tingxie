"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/server-utils";

export async function logReview(wordId: number, isCorrect: boolean) {
  try {
    const now = new Date();

    const existingProgress = await prisma.learningProgress.findUnique({
      where: { wordId },
    });

    let newStage = existingProgress ? existingProgress.stage : 0;
    let isMastered = existingProgress ? existingProgress.isMastered : false;

    if (isCorrect) {
      const intervals = [1, 2, 4, 7, 15, 30];
      newStage = Math.min(newStage + 1, intervals.length);

      if (newStage >= 4) isMastered = true;

      const daysToAdd = intervals[newStage - 1] || 1;
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + daysToAdd);

      await prisma.learningProgress.upsert({
        where: { wordId },
        update: {
          stage: newStage,
          lastReviewDate: now,
          nextReviewDate: nextReview,
          isMastered,
        },
        create: {
          wordId,
          stage: newStage,
          lastReviewDate: now,
          nextReviewDate: nextReview,
          isMastered,
        },
      });
    } else {
      newStage = 0;
      isMastered = false;

      await prisma.learningProgress.upsert({
        where: { wordId },
        update: {
          stage: newStage,
          lastReviewDate: now,
          nextReviewDate: now,
          isMastered: false,
        },
        create: {
          wordId,
          stage: newStage,
          lastReviewDate: now,
          nextReviewDate: now,
          isMastered: false,
        },
      });
    }

    await prisma.reviewLog.create({
      data: {
        wordId,
        outcome: isCorrect ? "correct" : "wrong",
        stage: newStage,
        reviewDate: now,
      },
    });

    safeRevalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Log review error:", error);
    return { success: false };
  }
}
