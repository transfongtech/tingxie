import { getGeminiClient } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export interface SyllableData {
  syllableList: string[];
  phonetic: string;
  notes: string;
}

export async function getOrGenerateSyllableData(
  wordId: number,
  wordContent: string
): Promise<SyllableData> {
  // 1. Check if syllableData already exists in database
  const wordObj = await prisma.word.findUnique({
    where: { id: wordId },
    select: { syllableData: true },
  });

  if (wordObj?.syllableData) {
    try {
      const parsed = JSON.parse(wordObj.syllableData);
      if (parsed.syllableList && Array.isArray(parsed.syllableList)) {
        return parsed as SyllableData;
      }
    } catch {
      // Fall through if parse fails
    }
  }

  // 2. Fallback heuristic split if no API key
  if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    const fallbackSyllables = simpleSyllableSplit(wordContent);
    const fallbackData: SyllableData = {
      syllableList: fallbackSyllables,
      phonetic: `/${wordContent}/`,
      notes: "Pay attention to the letter sequence and sound out each syllable.",
    };
    return fallbackData;
  }

  // 3. Call Gemini API to generate accurate Dyslexia syllable scaffolding
  try {
    const prompt = `For the English word "${wordContent}", provide a syllable breakdown suitable for a primary school student with dyslexia.

Return ONLY a valid JSON object with this exact structure:
{
  "syllableList": ["beau", "ti", "ful"],
  "phonetic": "/ˈbjuː.tɪ.fəl/",
  "notes": "The 'beau' spelling makes the /bjuː/ sound."
}

Rules:
- Split strictly by pronunciation syllables
- The "notes" field should be a short, encouraging note about any tricky letter patterns (max 20 words)`;

    const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    
    const text = response.text || "{}";
    const result = JSON.parse(text) as SyllableData;

    // Cache into database
    await prisma.word.update({
      where: { id: wordId },
      data: { syllableData: JSON.stringify(result) },
    });

    return result;
  } catch (error) {
    console.error("Gemini syllable generation error:", error);
    const fallbackSyllables = simpleSyllableSplit(wordContent);
    return {
      syllableList: fallbackSyllables,
      phonetic: `/${wordContent}/`,
      notes: "Focus on pronouncing each sound group carefully.",
    };
  }
}

function simpleSyllableSplit(word: string): string[] {
  // Simple heuristic split by vowel groups
  const parts = word.match(/[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi);
  return parts && parts.length > 0 ? parts : [word];
}
