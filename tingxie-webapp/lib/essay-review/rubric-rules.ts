import type { StoryCompleteness } from "./schema";
import { ESSAY_REVIEW_RUBRIC_VERSION } from "./versions";

export type ContentBandId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";
export type LanguageBandId = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";

export interface ScoreBand<Id extends string> {
  readonly id: Id;
  readonly min: number;
  readonly max: number;
  readonly summary: string;
}

export interface EssayRubric {
  readonly version: string;
  readonly displayName: string;
  readonly maximumScore: {
    readonly content: 18;
    readonly language: 18;
    readonly total: 36;
  };
  readonly minimumExpectedWords: number;
  readonly shortCompositionThreshold: number;
  readonly shortCompositionContentCap: number;
  readonly incompleteStoryContentCap: number;
  readonly contentBands: readonly ScoreBand<ContentBandId>[];
  readonly languageBands: readonly ScoreBand<LanguageBandId>[];
}

const CONTENT_BANDS: readonly ScoreBand<ContentBandId>[] = [
  { id: "C1", min: 16, max: 18, summary: "Fully relevant, developed and engaging" },
  { id: "C2", min: 13, max: 15, summary: "Relevant and reasonably developed" },
  { id: "C3", min: 10, max: 12, summary: "Relevant but unevenly developed" },
  { id: "C4", min: 7, max: 9, summary: "Barely relevant, thin or incomplete" },
  { id: "C5", min: 4, max: 6, summary: "Largely irrelevant, fragmentary or extremely short" },
  { id: "C6", min: 0, max: 3, summary: "Essentially blank, copied or unintelligible" },
];

const LANGUAGE_BANDS: readonly ScoreBand<LanguageBandId>[] = [
  { id: "L1", min: 16, max: 18, summary: "Excellent control and fluency" },
  { id: "L2", min: 13, max: 15, summary: "Good control with minor lapses" },
  { id: "L3", min: 10, max: 12, summary: "Adequate control with noticeable errors" },
  { id: "L4", min: 7, max: 9, summary: "Frequent errors affecting clarity" },
  { id: "L5", min: 4, max: 6, summary: "Poor control; often difficult to understand" },
  { id: "L6", min: 0, max: 3, summary: "Barely comprehensible" },
];

export const DEFAULT_ESSAY_RUBRIC: EssayRubric = {
  version: ESSAY_REVIEW_RUBRIC_VERSION,
  displayName: "PSLE 2025 Continuous Writing",
  maximumScore: { content: 18, language: 18, total: 36 },
  minimumExpectedWords: 120,
  shortCompositionThreshold: 80,
  shortCompositionContentCap: 9,
  incompleteStoryContentCap: 9,
  contentBands: CONTENT_BANDS,
  languageBands: LANGUAGE_BANDS,
};

export function configureEssayRubric(
  overrides: Partial<
    Pick<
      EssayRubric,
      | "version"
      | "displayName"
      | "minimumExpectedWords"
      | "shortCompositionThreshold"
      | "shortCompositionContentCap"
      | "incompleteStoryContentCap"
    >
  > = {},
): EssayRubric {
  return { ...DEFAULT_ESSAY_RUBRIC, ...overrides };
}

export function countEssayWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export function calculateTotalScore(content: number, language: number): number {
  return content + language;
}

export function contentScoreCap(
  wordCount: number,
  completeness: StoryCompleteness,
  rubric: EssayRubric = DEFAULT_ESSAY_RUBRIC,
): number {
  let cap: number = rubric.maximumScore.content;
  if (wordCount < rubric.shortCompositionThreshold) {
    cap = Math.min(cap, rubric.shortCompositionContentCap);
  }
  if (completeness === "incomplete") {
    cap = Math.min(cap, rubric.incompleteStoryContentCap);
  }
  return cap;
}

export function applyContentScoreCap(
  proposedScore: number,
  wordCount: number,
  completeness: StoryCompleteness,
  rubric: EssayRubric = DEFAULT_ESSAY_RUBRIC,
): number {
  return Math.min(proposedScore, contentScoreCap(wordCount, completeness, rubric));
}

export function bandForScore<Id extends string>(
  score: number,
  bands: readonly ScoreBand<Id>[],
): Id | undefined {
  return bands.find((band) => score >= band.min && score <= band.max)?.id;
}

export interface EssayScoreSubmission {
  content: number;
  language: number;
  contentBand: ContentBandId;
  languageBand: LanguageBandId;
  completeness: StoryCompleteness;
  wordCount: number;
  total?: number;
}

export interface EssayScoreValidation {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly calculatedTotal: number;
}

export function validateEssayScores(
  submission: EssayScoreSubmission,
  rubric: EssayRubric = DEFAULT_ESSAY_RUBRIC,
): EssayScoreValidation {
  const errors: string[] = [];
  const calculatedTotal = calculateTotalScore(submission.content, submission.language);
  const expectedContentBand = bandForScore(submission.content, rubric.contentBands);
  const expectedLanguageBand = bandForScore(submission.language, rubric.languageBands);

  if (!Number.isInteger(submission.content) || expectedContentBand === undefined) {
    errors.push(`Content score must be an integer from 0 to ${rubric.maximumScore.content}.`);
  } else if (expectedContentBand !== submission.contentBand) {
    errors.push(`Content score ${submission.content} belongs to ${expectedContentBand}, not ${submission.contentBand}.`);
  }

  if (!Number.isInteger(submission.language) || expectedLanguageBand === undefined) {
    errors.push(`Language score must be an integer from 0 to ${rubric.maximumScore.language}.`);
  } else if (expectedLanguageBand !== submission.languageBand) {
    errors.push(`Language score ${submission.language} belongs to ${expectedLanguageBand}, not ${submission.languageBand}.`);
  }

  if (!Number.isInteger(submission.wordCount) || submission.wordCount < 0) {
    errors.push("Word count must be a non-negative integer.");
  } else {
    const cap = contentScoreCap(submission.wordCount, submission.completeness, rubric);
    if (submission.content > cap) {
      errors.push(`Content score ${submission.content} exceeds the applicable cap of ${cap}.`);
    }
  }

  if (submission.completeness !== "complete" && submission.completeness !== "incomplete") {
    errors.push("Completeness must be either complete or incomplete.");
  }

  if (submission.total !== undefined && submission.total !== calculatedTotal) {
    errors.push(`Total must equal the server-calculated score of ${calculatedTotal}.`);
  }

  return { valid: errors.length === 0, errors, calculatedTotal };
}
