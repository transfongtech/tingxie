"use server";

import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/server-utils";

export async function getWeeks(
  language?: "zh" | "en",
  grade?: number,
  term?: number
) {
  try {
    const whereClause: any = {};
    if (language) whereClause.language = language;
    if (grade) whereClause.grade = grade;
    if (term) whereClause.term = term;

    const weeks = await prisma.week.findMany({
      where: whereClause,
      orderBy: [
        { grade: "asc" },
        { term: "asc" },
        { language: "asc" },
        { number: "asc" },
      ],
      include: {
        wordLists: {
          include: {
            word: true,
          },
        },
      },
    });

    return { success: true, weeks };
  } catch (error) {
    console.error("getWeeks error:", error);
    return { success: false, error: "获取周次失败" };
  }
}

export async function getWeekDetail(weekId: number) {
  try {
    const week = await prisma.week.findUnique({
      where: { id: weekId },
      include: {
        wordLists: {
          include: {
            word: true,
          },
        },
      },
    });

    if (!week) return { success: false, error: "未找到该周次" };

    return { success: true, week };
  } catch (error) {
    console.error("getWeekDetail error:", error);
    return { success: false, error: "获取周次详情失败" };
  }
}

export async function createWeek(data: {
  number: number;
  language: "zh" | "en";
  grade?: number;
  term?: number;
  title: string;
  dictationDate?: string;
}) {
  try {
    const dictationDate = data.dictationDate ? new Date(data.dictationDate) : null;
    const grade = data.grade ? Number(data.grade) : 3;
    const term = data.term ? Number(data.term) : 1;

    const week = await prisma.week.create({
      data: {
        number: Number(data.number),
        language: data.language,
        grade,
        term,
        title: data.title.trim(),
        dictationDate,
      },
    });

    safeRevalidatePath("/manage");
    safeRevalidatePath("/");
    return { success: true, week };
  } catch (error: any) {
    console.error("createWeek error:", error);
    if (error.code === "P2002") {
      return {
        success: false,
        error: `第 ${data.grade || 3} 年级 ${data.term || 1} 学期第 ${data.number} 周 (${data.language === 'en' ? '英文' : '华文'}) 已存在`,
      };
    }
    return { success: false, error: "创建周次失败" };
  }
}

export async function updateWeek(
  weekId: number,
  data: {
    number?: number;
    grade?: number;
    term?: number;
    title?: string;
    dictationDate?: string;
    isActive?: boolean;
  }
) {
  try {
    const updateData: any = {};
    if (data.number !== undefined) updateData.number = Number(data.number);
    if (data.grade !== undefined) updateData.grade = Number(data.grade);
    if (data.term !== undefined) updateData.term = Number(data.term);
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.dictationDate !== undefined) {
      updateData.dictationDate = data.dictationDate ? new Date(data.dictationDate) : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const week = await prisma.week.update({
      where: { id: weekId },
      data: updateData,
    });

    safeRevalidatePath("/manage");
    safeRevalidatePath(`/manage/week/${weekId}`);
    safeRevalidatePath("/");
    return { success: true, week };
  } catch (error) {
    console.error("updateWeek error:", error);
    return { success: false, error: "更新周次失败" };
  }
}

export async function deleteWeek(weekId: number) {
  try {
    await prisma.wordList.deleteMany({
      where: { weekId },
    });

    await prisma.week.delete({
      where: { id: weekId },
    });

    safeRevalidatePath("/manage");
    safeRevalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("deleteWeek error:", error);
    return { success: false, error: "删除周次失败" };
  }
}

export async function addWordsToWeek(weekId: number, rawInput: string) {
  try {
    if (!rawInput.trim()) {
      return { success: false, error: "请输入内容" };
    }

    const parsedWords = Array.from(
      new Set(
        rawInput
          .split(/[\n,，]+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0)
      )
    );

    if (parsedWords.length === 0) {
      return { success: false, error: "未解析出有效词汇" };
    }

    let addedCount = 0;

    for (const content of parsedWords) {
      const wordObj = await prisma.word.upsert({
        where: { content },
        update: {},
        create: { content },
      });

      await prisma.wordList.upsert({
        where: {
          weekId_wordId: {
            weekId,
            wordId: wordObj.id,
          },
        },
        update: {},
        create: {
          weekId,
          wordId: wordObj.id,
        },
      });

      addedCount++;
    }

    safeRevalidatePath("/manage");
    safeRevalidatePath(`/manage/week/${weekId}`);
    safeRevalidatePath("/");

    return { success: true, addedCount, totalParsed: parsedWords.length };
  } catch (error) {
    console.error("addWordsToWeek error:", error);
    return { success: false, error: "导入词汇失败" };
  }
}

export async function removeWordFromWeek(weekId: number, wordId: number) {
  try {
    await prisma.wordList.delete({
      where: {
        weekId_wordId: {
          weekId,
          wordId,
        },
      },
    });

    safeRevalidatePath(`/manage/week/${weekId}`);
    safeRevalidatePath("/manage");
    return { success: true };
  } catch (error) {
    console.error("removeWordFromWeek error:", error);
    return { success: false, error: "删除词汇失败" };
  }
}
