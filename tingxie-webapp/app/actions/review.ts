"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function logReview(wordId: number, isCorrect: boolean) {
    try {
        const now = new Date();

        // 1. Get or create current progress
        const existingProgress = await prisma.learningProgress.findUnique({
            where: { wordId },
        });

        let newStage = existingProgress ? existingProgress.stage : 0;
        let isMastered = existingProgress ? existingProgress.isMastered : false;

        if (isCorrect) {
            // Ebbinghaus-style intervals (days): 1, 2, 4, 7, 15, 30...
            const intervals = [1, 2, 4, 7, 15, 30];
            newStage = Math.min(newStage + 1, intervals.length);

            // Mark mastered if passed stage 4 (approx 1 week of retention)
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
            // Reset if wrong
            newStage = 0;
            isMastered = false;

            await prisma.learningProgress.upsert({
                where: { wordId },
                update: {
                    stage: newStage,
                    lastReviewDate: now,
                    nextReviewDate: now, // Review again ASAP
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

        // 2. Log entry
        await prisma.reviewLog.create({
            data: {
                wordId,
                outcome: isCorrect ? "correct" : "wrong",
                stage: newStage,
                reviewDate: now,
            },
        });

        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Log review error:", error);
        return { success: false };
    }
}
