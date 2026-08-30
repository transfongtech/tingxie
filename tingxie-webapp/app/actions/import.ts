"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/server-utils";

export interface StructuredUnitInput {
  number: number;
  title: string;
  grade: number;
  term: number;
  language: string; // "zh" | "en"
  items: string[];
}

export async function importStructuredUnits(units: StructuredUnitInput[]) {
  try {
    let totalAdded = 0;
    for (const unit of units) {
      const week = await prisma.week.upsert({
        where: {
          number_language_grade_term: {
            number: unit.number,
            language: unit.language || "zh",
            grade: unit.grade || 4,
            term: unit.term || 2,
          },
        },
        update: {
          title: unit.title,
          isActive: true,
        },
        create: {
          number: unit.number,
          title: unit.title,
          language: unit.language || "zh",
          grade: unit.grade || 4,
          term: unit.term || 2,
          isActive: true,
        },
      });

      for (const itemText of unit.items) {
        const trimmed = itemText.trim();
        if (!trimmed) continue;

        const wordObj = await prisma.word.upsert({
          where: { content: trimmed },
          update: {},
          create: { content: trimmed },
        });

        await prisma.wordList.upsert({
          where: {
            weekId_wordId: {
              weekId: week.id,
              wordId: wordObj.id,
            },
          },
          update: {},
          create: {
            weekId: week.id,
            wordId: wordObj.id,
          },
        });
        totalAdded++;
      }
    }

    safeRevalidatePath("/tingxie");
    safeRevalidatePath("/");
    return { success: true, count: totalAdded, unitsCount: units.length };
  } catch (error: any) {
    console.error("Batch import error:", error);
    return { success: false, message: error.message || "Failed to import units" };
  }
}

export async function saveWords(formData: FormData) {
  const weekNumber = parseInt(formData.get("week") as string);
  const rawContent = formData.get("content") as string;
  const grade = parseInt((formData.get("grade") as string) || "4");
  const term = parseInt((formData.get("term") as string) || "2");
  const language = (formData.get("language") as string) || "zh";
  const title = (formData.get("title") as string) || `Week ${weekNumber}`;

  if (!weekNumber || !rawContent) {
    return { success: false, message: "Missing week number or content" };
  }

  const words = rawContent
    .split(/[\n,，]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return { success: false, message: "No valid words found" };
  }

  return await importStructuredUnits([
    {
      number: weekNumber,
      title,
      grade,
      term,
      language,
      items: words,
    },
  ]);
}

