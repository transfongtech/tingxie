import { normalizeEssayReviewResult } from "./normalize";
import {
  EssayReviewInputError,
  EssayReviewProviderError,
  EssayReviewQualityError,
  type EssayReviewInput,
  type EssayReviewProvider,
} from "./provider";
import { buildEssayReviewPrompt, buildRepairPrompt } from "./prompt";
import { validateReviewQuality, type ReviewQualityFinding } from "./quality-gate";
import type { EssayReviewResultV2 } from "./schema";

export interface EssayReviewCoreOptions {
  readonly gradeLevel?: string;
  readonly studentName?: string;
  readonly now?: () => Date;
}

export interface EssayReviewCoreResult {
  readonly review: EssayReviewResultV2;
  readonly provider: string;
  readonly model: string;
  readonly attempts: 1 | 2;
}

export async function reviewEssay(
  input: EssayReviewInput,
  provider: EssayReviewProvider,
  options: EssayReviewCoreOptions = {},
): Promise<EssayReviewCoreResult> {
  const text = input.text;
  if (text.trim().length < 5) {
    throw new EssayReviewInputError("Composition content is too short or missing.");
  }
  const images = input.images ?? [];
  const originalPrompt = buildEssayReviewPrompt(
    text,
    input.prompt,
    images.length > 0,
    { gradeLevel: options.gradeLevel, studentName: options.studentName, model: provider.model },
  );
  let findings: readonly ReviewQualityFinding[] = [];

  for (const attempt of [1, 2] as const) {
    let rawReview: unknown;
    try {
      rawReview = await provider.generate({
        prompt: attempt === 1 ? originalPrompt : buildRepairPrompt(originalPrompt, findings),
        images,
        attempt,
        repairFindings: findings,
      });
    } catch (error) {
      if (error instanceof EssayReviewProviderError) throw error;
      throw new EssayReviewProviderError(error);
    }
    const validation = validateReviewQuality(text, rawReview);
    if (validation.valid) {
      return {
        review: normalizeEssayReviewResult(text, validation.value, {
          model: provider.model,
          attempt,
          now: options.now,
        }),
        provider: provider.id,
        model: provider.model,
        attempts: attempt,
      };
    }
    findings = validation.findings;
  }

  throw new EssayReviewQualityError(findings, 2);
}
