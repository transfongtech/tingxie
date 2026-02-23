"use server";

import { PrismaClient } from "@prisma/client";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function saveWords(formData: FormData) {
    const weekNumber = parseInt(formData.get("week") as string);
    const rawContent = formData.get("content") as string;

    if (!weekNumber || !rawContent) {
        return { success: false, message: "Missing week number or content" };
    }

    // Parse words: split by comma, newline, or Chinese comma
    const words = rawContent
        .split(/[\n,，]+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

    if (words.length === 0) {
        return { success: false, message: "No valid words found" };
    }

    try {
        // 1. Upsert Week
        // 1. Upsert Week
        const week = await prisma.week.upsert({
            where: {
                number_language: {
                    number: weekNumber,
                    language: "zh"
                }
            },
            update: {},
            create: {
                number: weekNumber,
                title: `Week ${weekNumber}`,
                isActive: true, // Default to active if just imported
                language: "zh"
            },
        });

        // 2. Process Words
        let addedCount = 0;
        for (const wordText of words) {
            // Create word if not exists
            const word = await prisma.word.upsert({
                where: { content: wordText },
                update: {},
                create: { content: wordText },
            });

            // Link to Week (WordList)
            await prisma.wordList.upsert({
                where: {
                    weekId_wordId: {
                        weekId: week.id,
                        wordId: word.id,
                    },
                },
                update: {},
                create: {
                    weekId: week.id,
                    wordId: word.id,
                },
            });
            addedCount++;
        }

        revalidatePath("/");
        return { success: true, message: `Successfully added ${addedCount} words to Week ${weekNumber}` };
    } catch (error) {
        console.error("Import error:", error);
        return { success: false, message: "Failed to save words to database" };
    }
}
