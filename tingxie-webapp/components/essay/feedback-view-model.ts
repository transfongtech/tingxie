import type { EssayReviewResult } from "@/lib/essay-types";

export interface EssayFeedbackViewModel {
  isLegacy: boolean;
  strengths: string[];
  nextSteps: string[];
  summary: string;
  assessment: EssayReviewResult["assessment"];
  qualityMetadata: EssayReviewResult["qualityMetadata"];
}

function presentItems(items: readonly string[] | undefined, maximum: number): string[] {
  return (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maximum);
}

export function buildEssayFeedbackViewModel(
  review: EssayReviewResult,
): EssayFeedbackViewModel {
  const isLegacy = review.schemaVersion !== 2;

  return {
    isLegacy,
    strengths: isLegacy
      ? []
      : presentItems(review.studentFeedback?.strengths, 3),
    nextSteps: isLegacy
      ? []
      : presentItems(review.studentFeedback?.nextSteps, 3),
    summary: review.assessment?.summary?.trim() || review.summary.trim(),
    assessment: isLegacy ? undefined : review.assessment,
    qualityMetadata: isLegacy ? undefined : review.qualityMetadata,
  };
}
