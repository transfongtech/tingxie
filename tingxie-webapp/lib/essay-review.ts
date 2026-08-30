import { Type } from "@google/genai";

import { getGeminiClient } from "@/lib/gemini";
import { getCurrentGradeLevel, type Annotation, type EssayReviewResult } from "./essay-types";
import {
  ESSAY_REVIEW_ENGINE_VERSION,
  ESSAY_REVIEW_PROMPT_VERSION,
  EssayReviewProviderError,
  EssayReviewResponseError,
  buildEssayReviewPrompt,
  normalizeEssayReviewResult,
  resolveAnnotations,
  reviewEssay,
  type EssayReviewImage,
  type EssayReviewProviderRequest,
  type EssayReviewResultV2,
} from "./essay-review/index";

export * from "./essay-review/index";

export const ESSAY_REVIEW_PROVIDER = "google-genai";
export const REVIEW_MODEL = "gemini-2.5-flash";
export const ENGINE_VERSION = ESSAY_REVIEW_ENGINE_VERSION;
export const PROMPT_VERSION = ESSAY_REVIEW_PROMPT_VERSION;

export interface ImageInput {
  buffer: Buffer;
  mimeType?: string;
}

export type EssayReviewProvider = (
  request: EssayReviewProviderRequest,
) => Promise<unknown>;

export function buildReviewPrompt(
  essayText: string,
  promptTitle?: string,
  promptDescription?: string,
  hasImages = false,
): string {
  return buildEssayReviewPrompt(
    essayText,
    { title: promptTitle, description: promptDescription },
    hasImages,
    {
      gradeLevel: getCurrentGradeLevel(),
      studentName: "George",
      model: REVIEW_MODEL,
    },
  );
}

export function fixAnnotationIndices(
  essayText: string,
  annotations: Annotation[],
): Annotation[] {
  return resolveAnnotations(essayText, annotations ?? []).resolved;
}

export function withLegacyReviewShape(
  review: EssayReviewResultV2,
): EssayReviewResult & EssayReviewResultV2 {
  return {
    ...review,
    polishedText: review.polishedVersion.text,
    scores: {
      ...review.assessment.scores,
      polishedScores: review.polishedVersion.scores,
      contentBreakdown: review.assessment.contentBreakdown,
      languageBreakdown: review.assessment.languageBreakdown,
    },
    summary: review.assessment.summary,
  };
}

export function normalizeEssayReview(
  essayText: string,
  rawReview: unknown,
  attempt = 1,
): EssayReviewResult & EssayReviewResultV2 {
  try {
    return withLegacyReviewShape(normalizeEssayReviewResult(essayText, rawReview, {
      model: REVIEW_MODEL,
      attempt,
    }));
  } catch (error) {
    if (error instanceof EssayReviewResponseError) {
      throw new EssayReviewResponseError(error.details, "AI");
    }
    throw error;
  }
}

function normalizedImages(images: readonly ImageInput[]): EssayReviewImage[] {
  return images.map(({ buffer, mimeType }) => ({
    data: buffer,
    mimeType: mimeType || "image/jpeg",
  }));
}

export async function reviewEssayWithProvider(
  essayText: string,
  promptTitle: string | undefined,
  promptDescription: string | undefined,
  images: readonly ImageInput[] = [],
  provider: EssayReviewProvider,
): Promise<EssayReviewResult & EssayReviewResultV2> {
  const outcome = await reviewEssay(
    {
      text: essayText,
      prompt: { title: promptTitle, description: promptDescription },
      images: normalizedImages(images),
    },
    {
      id: "injected",
      model: REVIEW_MODEL,
      generate: provider,
    },
    { gradeLevel: getCurrentGradeLevel(), studentName: "George" },
  );
  return withLegacyReviewShape(outcome.review);
}

async function geminiReviewProvider({
  prompt,
  images,
}: EssayReviewProviderRequest): Promise<unknown> {
  const parts: Array<
    { text: string } | { inlineData: { data: string; mimeType: string } }
  > = [{ text: prompt }];
  for (const image of images) {
    parts.push({
      inlineData: {
        data: Buffer.from(image.data).toString("base64"),
        mimeType: image.mimeType,
      },
    });
  }

  let response;
  try {
    response = await getGeminiClient().models.generateContent({
      model: REVIEW_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
        responseSchema: REVIEW_RESPONSE_SCHEMA,
      },
    });
  } catch (error) {
    throw new EssayReviewProviderError(error);
  }

  if (!response.text) return null;
  try {
    return JSON.parse(response.text);
  } catch {
    return response.text;
  }
}

export async function reviewEssayWithAI(
  essayText: string,
  promptTitle?: string,
  promptDescription?: string,
  images: ImageInput[] = [],
): Promise<EssayReviewResult & EssayReviewResultV2> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new EssayReviewProviderError(new Error("API key is not configured."));
  }
  return reviewEssayWithProvider(
    essayText,
    promptTitle,
    promptDescription,
    images,
    geminiReviewProvider,
  );
}

const stringArray = { type: Type.ARRAY, items: { type: Type.STRING } };
const scores = {
  type: Type.OBJECT,
  properties: {
    content: { type: Type.INTEGER },
    language: { type: Type.INTEGER },
  },
  required: ["content", "language"],
};

const REVIEW_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    schemaVersion: { type: Type.INTEGER },
    annotations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["spelling", "grammar", "structure", "vocabulary"] },
          startIndex: { type: Type.INTEGER },
          endIndex: { type: Type.INTEGER },
          original: { type: Type.STRING },
          correction: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ["type", "startIndex", "endIndex", "original", "correction", "explanation"],
      },
    },
    studentFeedback: {
      type: Type.OBJECT,
      properties: { strengths: stringArray, nextSteps: stringArray },
      required: ["strengths", "nextSteps"],
    },
    assessment: {
      type: Type.OBJECT,
      properties: {
        scores,
        bands: {
          type: Type.OBJECT,
          properties: {
            content: { type: Type.STRING, enum: ["C1", "C2", "C3", "C4", "C5", "C6"] },
            language: { type: Type.STRING, enum: ["L1", "L2", "L3", "L4", "L5", "L6"] },
          },
          required: ["content", "language"],
        },
        completeness: { type: Type.STRING, enum: ["complete", "incomplete"] },
        evidence: {
          type: Type.OBJECT,
          properties: { content: stringArray, language: stringArray },
          required: ["content", "language"],
        },
        contentBreakdown: {
          type: Type.OBJECT,
          properties: {
            relevance: { type: Type.STRING },
            development: { type: Type.STRING },
            plotCoherence: { type: Type.STRING },
            engagement: { type: Type.STRING },
          },
          required: ["relevance", "development", "plotCoherence", "engagement"],
        },
        languageBreakdown: {
          type: Type.OBJECT,
          properties: {
            grammar: { type: Type.STRING },
            vocabulary: { type: Type.STRING },
            spelling: { type: Type.STRING },
            organisation: { type: Type.STRING },
          },
          required: ["grammar", "vocabulary", "spelling", "organisation"],
        },
        summary: { type: Type.STRING },
      },
      required: ["scores", "bands", "completeness", "evidence", "contentBreakdown", "languageBreakdown", "summary"],
    },
    polishedVersion: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        scores,
        changeSummary: stringArray,
        preservationJudgement: {
          type: Type.STRING,
          enum: ["preserved", "minor_changes", "major_changes"],
        },
      },
      required: ["text", "scores", "changeSummary", "preservationJudgement"],
    },
    spellingErrors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { wrong: { type: Type.STRING }, correct: { type: Type.STRING } },
        required: ["wrong", "correct"],
      },
    },
    goodPhrases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { phrase: { type: Type.STRING }, category: { type: Type.STRING } },
        required: ["phrase", "category"],
      },
    },
    qualityMetadata: {
      type: Type.OBJECT,
      properties: {
        engineVersion: { type: Type.STRING },
        promptVersion: { type: Type.STRING },
        model: { type: Type.STRING },
        generatedAt: { type: Type.STRING },
        attempt: { type: Type.INTEGER },
        warnings: stringArray,
      },
      required: ["engineVersion", "promptVersion", "model", "generatedAt", "attempt", "warnings"],
    },
  },
  required: [
    "schemaVersion", "annotations", "studentFeedback", "assessment",
    "polishedVersion", "spellingErrors", "goodPhrases", "qualityMetadata",
  ],
};
