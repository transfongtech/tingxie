"use server";

import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { safeRevalidatePath } from "@/lib/server-utils";
import { EssayReviewResult } from "@/lib/essay-types";
import { saveSuccessfulEssayFeedback } from "@/lib/essay-feedback-persistence";
import {
  persistPhrases,
  type PhraseDatabase,
} from "@/lib/phrase-persistence";
import {
  persistSpellingErrors,
  type SpellingImportDatabase,
} from "@/lib/spelling-import";

/**
 * 1. 创建新作文题目
 */
export async function createEssayPrompt(title: string, description?: string, imagePaths: string[] = []) {
  try {
    if (!title || title.trim().length === 0) {
      return { success: false, error: "Title is required" };
    }

    const prompt = await prisma.essayPrompt.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        images: {
          create: imagePaths.map((path, index) => ({
            imagePath: path,
            sortOrder: index,
          })),
        },
      },
      include: {
        images: true,
      },
    });

    safeRevalidatePath("/essay");
    return { success: true, data: prompt };
  } catch (error) {
    console.error("Error creating essay prompt:", error);
    return { success: false, error: "Failed to create essay prompt" };
  }
}

/**
 * 1b. 更新作文题目名称与描述
 */
export async function updateEssayPrompt(promptId: number, title: string, description?: string) {
  try {
    if (!title || title.trim().length === 0) {
      return { success: false, error: "Title is required" };
    }

    const updated = await prisma.essayPrompt.update({
      where: { id: promptId },
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
      },
    });

    safeRevalidatePath("/essay");
    safeRevalidatePath(`/essay/prompt/${promptId}`);

    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating essay prompt:", error);
    return { success: false, error: "Failed to update essay prompt" };
  }
}

/**
 * 1c. 删除作文题目 (级联删除图片、草稿、提交与批改记录)
 */
export async function deleteEssayPrompt(promptId: number) {
  try {
    // 1. 查询相关的关联提交记录 ID
    const submissions = await prisma.essaySubmission.findMany({
      where: { promptId },
      select: { id: true },
    });
    const submissionIds = submissions.map((s) => s.id);

    // 2. 删除 EssayFeedback
    if (submissionIds.length > 0) {
      await prisma.essayFeedback.deleteMany({
        where: { submissionId: { in: submissionIds } },
      });
    }

    // 3. 删除 EssaySubmission
    await prisma.essaySubmission.deleteMany({
      where: { promptId },
    });

    // 4. 删除 EssayDraft
    await prisma.essayDraft.deleteMany({
      where: { promptId },
    });

    // 5. 删除 EssayPromptImage
    await prisma.essayPromptImage.deleteMany({
      where: { promptId },
    });

    // 6. 删除 EssayPrompt
    await prisma.essayPrompt.delete({
      where: { id: promptId },
    });

    // 7. 尝试清理物理磁盘上上传的试卷图片目录
    try {
      const promptDir = path.join(process.cwd(), "public", "essay_prompts", String(promptId));
      if (fs.existsSync(promptDir)) {
        fs.rmSync(promptDir, { recursive: true, force: true });
      }
    } catch (fsErr) {
      console.warn("Failed to delete disk folder for prompt", promptId, fsErr);
    }

    safeRevalidatePath("/essay");

    return { success: true };
  } catch (error) {
    console.error("Error deleting essay prompt:", error);
    return { success: false, error: "Failed to delete essay prompt" };
  }
}

/**
 * 2. 保存/更新作文草稿 (Layer 2 服务端备份)
 */
export async function saveDraft(promptId: number, text: string) {
  try {
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const draft = await prisma.essayDraft.upsert({
      where: { promptId },
      update: {
        text,
        wordCount,
        updatedAt: new Date(),
      },
      create: {
        promptId,
        text,
        wordCount,
      },
    });

    // 静默保存，不刷新路径
    return { success: true, data: draft };
  } catch (error) {
    console.error("Error saving draft:", error);
    return { success: false, error: "Failed to save draft" };
  }
}

/**
 * 3. 读取作文草稿
 */
export async function loadDraft(promptId: number) {
  try {
    const draft = await prisma.essayDraft.findUnique({
      where: { promptId },
    });

    return { success: true, data: draft };
  } catch (error) {
    console.error("Error loading draft:", error);
    return { success: false, error: "Failed to load draft" };
  }
}

/**
 * 4. 删除草稿 (提交后清理)
 */
export async function deleteDraft(promptId: number) {
  try {
    await prisma.essayDraft.deleteMany({
      where: { promptId },
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting draft:", error);
    return { success: false, error: "Failed to delete draft" };
  }
}

/**
 * 5. 提交作文
 */
export async function submitEssay(promptId: number, essayText: string) {
  try {
    const trimmed = essayText.trim();
    if (!trimmed) {
      return { success: false, error: "Composition content cannot be empty" };
    }

    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

    const submission = await prisma.essaySubmission.create({
      data: {
        promptId,
        essayText: trimmed,
        wordCount,
        status: "submitted",
      },
    });

    // 提交成功后自动删除对应的草稿
    await deleteDraft(promptId);

    safeRevalidatePath("/essay");
    safeRevalidatePath(`/essay/prompt/${promptId}`);

    return { success: true, data: { submissionId: submission.id } };
  } catch (error) {
    console.error("Error submitting essay:", error);
    return { success: false, error: "Failed to submit composition" };
  }
}

/**
 * 6. 保存 AI 批改结果
 */
export async function saveEssayFeedback(submissionId: number, feedbackData: EssayReviewResult) {
  try {
    const quality = feedbackData.qualityMetadata;
    const feedback = await saveSuccessfulEssayFeedback(submissionId, feedbackData, {
      engineVersion: quality?.engineVersion,
      promptVersion: quality?.promptVersion,
      model: quality?.model,
      attemptCount: quality?.attempt,
      qualityMetadata: quality,
    }, prisma);

    const phrasePersistence = await persistPhrases(
      feedbackData.goodPhrases ?? [],
      "ai",
      prisma as unknown as PhraseDatabase,
    );
    if (phrasePersistence.error) {
      console.error("Failed to persist AI phrases:", phrasePersistence.error);
    }

    safeRevalidatePath(`/essay/submission/${submissionId}`);
    safeRevalidatePath("/essay");

    return { success: true, data: feedback, phrasePersistence };
  } catch (error) {
    console.error("Error saving essay feedback:", error);
    return { success: false, error: "Failed to save composition feedback" };
  }
}

/**
 * 7. 导入拼写错词到听写/Spelling 模块
 */
export async function importSpellingErrors(errors: readonly unknown[]) {
  const result = await persistSpellingErrors(
    errors,
    prisma as unknown as SpellingImportDatabase,
  );
  if (result.imported > 0) {
    safeRevalidatePath("/");
    safeRevalidatePath("/tingxie");
  }
  if (result.failed > 0) {
    console.error("Spelling import database failures:", result.items.filter(
      (item) => item.status === "failed",
    ));
  }
  return result;
}
