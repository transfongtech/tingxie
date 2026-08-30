"use server";

import { getOrGenerateSyllableData, SyllableData } from "@/lib/syllable";

export async function fetchSyllableScaffolding(
  wordId: number,
  wordContent: string
): Promise<{ success: boolean; data?: SyllableData; error?: string }> {
  try {
    const data = await getOrGenerateSyllableData(wordId, wordContent);
    return { success: true, data };
  } catch (error) {
    console.error("fetchSyllableScaffolding action error:", error);
    return { success: false, error: "无法获取音节拆解数据" };
  }
}
