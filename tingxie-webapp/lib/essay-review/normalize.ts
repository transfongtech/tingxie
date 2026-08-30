import {
  applyContentScoreCap,
  bandForScore,
  countEssayWords,
  DEFAULT_ESSAY_RUBRIC,
} from "./rubric-rules";
import { resolveAnnotations } from "./annotation-resolver";
import {
  parseEssayReviewResult,
  type EssayReviewResultV2,
} from "./schema";
import {
  ESSAY_REVIEW_ENGINE_VERSION,
  ESSAY_REVIEW_PROMPT_VERSION,
} from "./versions";
import { EssayReviewResponseError } from "./provider";

export interface EssayReviewNormalizationOptions {
  readonly model: string;
  readonly attempt?: number;
  readonly now?: () => Date;
}

export function normalizeEssayReviewResult(
  essayText: string,
  rawReview: unknown,
  options: EssayReviewNormalizationOptions,
): EssayReviewResultV2 {
  const parsed = parseEssayReviewResult(rawReview);
  if (!parsed.ok) {
    const details = parsed.errors
      .map(({ path, message }) => `${path}: ${message}`)
      .join("; ");
    throw new EssayReviewResponseError(details);
  }

  const review = parsed.value;
  const resolution = resolveAnnotations(essayText, review.annotations);
  const proposedContent = review.assessment.scores.content;
  const cappedContent = applyContentScoreCap(
    proposedContent,
    countEssayWords(essayText),
    review.assessment.completeness,
  );
  const contentBand = bandForScore(cappedContent, DEFAULT_ESSAY_RUBRIC.contentBands);
  const languageBand = bandForScore(
    review.assessment.scores.language,
    DEFAULT_ESSAY_RUBRIC.languageBands,
  );
  if (!contentBand || !languageBand) {
    throw new Error("Validated review scores did not map to rubric bands.");
  }

  const warnings = [...review.qualityMetadata.warnings];
  if (resolution.unresolved.length > 0) {
    warnings.push(`${resolution.unresolved.length} annotation(s) could not be matched to the original essay.`);
  }
  if (cappedContent !== proposedContent) {
    warnings.push(`Content score was capped from ${proposedContent} to ${cappedContent} by rubric rules.`);
  }

  return {
    ...review,
    annotations: resolution.resolved,
    assessment: {
      ...review.assessment,
      scores: { ...review.assessment.scores, content: cappedContent },
      bands: { content: contentBand, language: languageBand },
    },
    qualityMetadata: {
      ...review.qualityMetadata,
      engineVersion: ESSAY_REVIEW_ENGINE_VERSION,
      promptVersion: ESSAY_REVIEW_PROMPT_VERSION,
      model: options.model,
      generatedAt: (options.now ?? (() => new Date()))().toISOString(),
      attempt: options.attempt ?? 1,
      warnings,
    },
  };
}
