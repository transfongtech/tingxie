import type { EssayReviewResultV2 } from "./schema";
import { parseEssayReviewResult } from "./schema";
import { resolveAnnotations } from "./annotation-resolver";
import {
  bandForScore,
  contentScoreCap,
  countEssayWords,
  DEFAULT_ESSAY_RUBRIC,
} from "./rubric-rules";

export type ReviewQualityFindingCode =
  | "SCHEMA_CONTRACT"
  | "SCORE_BAND_MISMATCH"
  | "COMPLETENESS_SCORE_CAP"
  | "COMPLETENESS_CONTRADICTION"
  | "ANNOTATION_RANGE_MISMATCH"
  | "ANNOTATION_UNRESOLVED"
  | "SPELLING_ANNOTATION_MISSING"
  | "SPELLING_ERROR_MISSING";

export interface ReviewQualityFinding {
  code: ReviewQualityFindingCode;
  path: string;
  message: string;
}

export type ReviewQualityValidationResult =
  | { valid: true; value: EssayReviewResultV2; findings: [] }
  | { valid: false; findings: ReviewQualityFinding[] };

const pairKey = (wrong: string, correct: string) =>
  `${wrong.trim().toLocaleLowerCase()}\u0000${correct.trim().toLocaleLowerCase()}`;

function saysIncomplete(text: string): boolean {
  return /\b(incomplete|unfinished)\b|(?:no|missing|lacks?) (?:a )?(?:clear )?(?:ending|resolution)/i.test(
    text,
  );
}

export function validateReviewQuality(
  essayText: string,
  rawReview: unknown,
): ReviewQualityValidationResult {
  const parsed = parseEssayReviewResult(rawReview);
  if (!parsed.ok) {
    return {
      valid: false,
      findings: parsed.errors.map((error) => ({
        code: "SCHEMA_CONTRACT",
        path: error.path,
        message: `${error.code}: ${error.message}`,
      })),
    };
  }

  const review = parsed.value;
  const findings: ReviewQualityFinding[] = [];
  const expectedContentBand = bandForScore(
    review.assessment.scores.content,
    DEFAULT_ESSAY_RUBRIC.contentBands,
  );
  const expectedLanguageBand = bandForScore(
    review.assessment.scores.language,
    DEFAULT_ESSAY_RUBRIC.languageBands,
  );

  if (expectedContentBand !== review.assessment.bands.content) {
    findings.push({
      code: "SCORE_BAND_MISMATCH",
      path: "$.assessment.bands.content",
      message: `Content score ${review.assessment.scores.content} requires ${expectedContentBand}.`,
    });
  }
  if (expectedLanguageBand !== review.assessment.bands.language) {
    findings.push({
      code: "SCORE_BAND_MISMATCH",
      path: "$.assessment.bands.language",
      message: `Language score ${review.assessment.scores.language} requires ${expectedLanguageBand}.`,
    });
  }

  const cap = contentScoreCap(
    countEssayWords(essayText),
    review.assessment.completeness,
  );
  if (review.assessment.scores.content > cap) {
    findings.push({
      code: "COMPLETENESS_SCORE_CAP",
      path: "$.assessment.scores.content",
      message: `Content score must not exceed the applicable cap of ${cap}.`,
    });
  }

  const developmentSaysIncomplete = saysIncomplete(
    review.assessment.contentBreakdown.development,
  );
  if (
    review.assessment.completeness === "complete" &&
    developmentSaysIncomplete
  ) {
    findings.push({
      code: "COMPLETENESS_CONTRADICTION",
      path: "$.assessment.completeness",
      message: "Completeness contradicts the development assessment.",
    });
  }

  const resolution = resolveAnnotations(essayText, review.annotations);
  review.annotations.forEach((annotation, index) => {
    if (
      essayText.slice(annotation.startIndex, annotation.endIndex) !==
        annotation.original ||
      annotation.endIndex !== annotation.startIndex + annotation.original.length
    ) {
      findings.push({
        code: "ANNOTATION_RANGE_MISMATCH",
        path: `$.annotations[${index}]`,
        message: "Annotation offsets must exactly select original text.",
      });
    }
  });
  resolution.unresolved.forEach(({ annotation, reason }) => {
    const annotationIndex = review.annotations.indexOf(
      annotation as (typeof review.annotations)[number],
    );
    findings.push({
      code: "ANNOTATION_UNRESOLVED",
      path: `$.annotations[${annotationIndex}]`,
      message: `Annotation cannot be resolved against the essay (${reason}).`,
    });
  });

  const annotationPairs = new Set(
    review.annotations
      .filter((annotation) => annotation.type === "spelling")
      .map((annotation) => pairKey(annotation.original, annotation.correction)),
  );
  const spellingPairs = new Set(
    review.spellingErrors.map((error) => pairKey(error.wrong, error.correct)),
  );
  review.spellingErrors.forEach((error, index) => {
    if (!annotationPairs.has(pairKey(error.wrong, error.correct))) {
      findings.push({
        code: "SPELLING_ANNOTATION_MISSING",
        path: `$.spellingErrors[${index}]`,
        message: "Every spelling error must have a matching spelling annotation.",
      });
    }
  });
  review.annotations.forEach((annotation, index) => {
    if (
      annotation.type === "spelling" &&
      !spellingPairs.has(pairKey(annotation.original, annotation.correction))
    ) {
      findings.push({
        code: "SPELLING_ERROR_MISSING",
        path: `$.annotations[${index}]`,
        message: "Every spelling annotation must have a matching spellingErrors entry.",
      });
    }
  });

  return findings.length === 0
    ? { valid: true, value: review, findings: [] }
    : { valid: false, findings };
}

export function formatRepairFindings(
  findings: readonly ReviewQualityFinding[],
): string {
  return JSON.stringify(
    findings.map(({ code, path, message }) => ({ code, path, message })),
  );
}
