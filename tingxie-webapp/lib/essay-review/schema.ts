import { ESSAY_REVIEW_SCHEMA_VERSION } from "./versions";

export { ESSAY_REVIEW_SCHEMA_VERSION } from "./versions";

export const ANNOTATION_TYPES = [
  "spelling",
  "grammar",
  "structure",
  "vocabulary",
] as const;

export type AnnotationType = (typeof ANNOTATION_TYPES)[number];

export const CONTENT_BANDS = ["C1", "C2", "C3", "C4", "C5", "C6"] as const;
export const LANGUAGE_BANDS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;
export const STORY_COMPLETENESS = ["complete", "incomplete"] as const;
export const PRESERVATION_JUDGEMENTS = [
  "preserved",
  "minor_changes",
  "major_changes",
] as const;

export type ContentBand = (typeof CONTENT_BANDS)[number];
export type LanguageBand = (typeof LANGUAGE_BANDS)[number];
export type StoryCompleteness = (typeof STORY_COMPLETENESS)[number];
export type PreservationJudgement = (typeof PRESERVATION_JUDGEMENTS)[number];

export interface ReviewAnnotation {
  type: AnnotationType;
  startIndex: number;
  endIndex: number;
  original: string;
  correction: string;
  explanation: string;
}

export interface ReviewScores {
  content: number;
  language: number;
}

export interface EssayAssessment {
  scores: ReviewScores;
  bands: {
    content: ContentBand;
    language: LanguageBand;
  };
  completeness: StoryCompleteness;
  evidence: {
    content: string[];
    language: string[];
  };
  contentBreakdown: {
    relevance: string;
    development: string;
    plotCoherence: string;
    engagement: string;
  };
  languageBreakdown: {
    grammar: string;
    vocabulary: string;
    spelling: string;
    organisation: string;
  };
  summary: string;
}

export interface EssayReviewResultV2 {
  schemaVersion: typeof ESSAY_REVIEW_SCHEMA_VERSION;
  annotations: ReviewAnnotation[];
  studentFeedback: {
    strengths: string[];
    nextSteps: string[];
  };
  assessment: EssayAssessment;
  polishedVersion: {
    text: string;
    scores: ReviewScores;
    changeSummary: string[];
    preservationJudgement: PreservationJudgement;
  };
  spellingErrors: Array<{
    wrong: string;
    correct: string;
  }>;
  goodPhrases: Array<{
    phrase: string;
    category: string;
  }>;
  qualityMetadata: {
    engineVersion: string;
    promptVersion: string;
    model: string;
    generatedAt: string;
    attempt: number;
    warnings: string[];
  };
}

export type EssayReviewValidationErrorCode =
  | "required"
  | "invalid_type"
  | "invalid_literal"
  | "invalid_enum"
  | "out_of_range"
  | "invalid_value";

export interface EssayReviewValidationError {
  path: string;
  code: EssayReviewValidationErrorCode;
  message: string;
}

export type EssayReviewParseResult =
  | { ok: true; value: EssayReviewResultV2 }
  | { ok: false; errors: EssayReviewValidationError[] };

type UnknownRecord = Record<string, unknown>;

class ValidationContext {
  readonly errors: EssayReviewValidationError[] = [];

  add(
    path: string,
    code: EssayReviewValidationErrorCode,
    message: string,
  ): void {
    this.errors.push({ path, code, message });
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(
  value: unknown,
  path: string,
  context: ValidationContext,
): UnknownRecord | undefined {
  if (!isRecord(value)) {
    context.add(path, "invalid_type", `${path} must be an object`);
    return undefined;
  }
  return value;
}

function required(record: UnknownRecord, key: string, path: string, context: ValidationContext): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    context.add(`${path}.${key}`, "required", `${path}.${key} is required`);
    return undefined;
  }
  return record[key];
}

function readString(
  value: unknown,
  path: string,
  context: ValidationContext,
): string | undefined {
  if (typeof value !== "string") {
    context.add(path, "invalid_type", `${path} must be a string`);
    return undefined;
  }
  if (value.trim().length === 0) {
    context.add(path, "invalid_value", `${path} must not be empty`);
    return undefined;
  }
  return value;
}

function readInteger(
  value: unknown,
  path: string,
  context: ValidationContext,
  minimum: number,
  maximum?: number,
): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    context.add(path, "invalid_type", `${path} must be an integer`);
    return undefined;
  }
  if (value < minimum || (maximum !== undefined && value > maximum)) {
    const upperBound = maximum === undefined ? "" : ` and ${maximum}`;
    context.add(path, "out_of_range", `${path} must be between ${minimum}${upperBound}`);
    return undefined;
  }
  return value;
}

function readStringArray(
  value: unknown,
  path: string,
  context: ValidationContext,
  minimum: number,
  maximum?: number,
): string[] | undefined {
  if (!Array.isArray(value)) {
    context.add(path, "invalid_type", `${path} must be an array`);
    return undefined;
  }

  if (value.length < minimum || (maximum !== undefined && value.length > maximum)) {
    const range = maximum === undefined ? `at least ${minimum}` : `${minimum} to ${maximum}`;
    context.add(path, "out_of_range", `${path} must contain ${range} items`);
  }
  const parsed = value.map((item, index) =>
    readString(item, `${path}[${index}]`, context),
  );
  return parsed.every((item): item is string => item !== undefined)
    ? parsed
    : undefined;
}

function readEnum<T extends string>(
  value: unknown,
  path: string,
  context: ValidationContext,
  values: readonly T[],
): T | undefined {
  if (typeof value !== "string") {
    context.add(path, "invalid_type", `${path} must be a string`);
    return undefined;
  }
  const parsed = values.find((candidate) => candidate === value);
  if (parsed === undefined) {
    context.add(path, "invalid_enum", `${path} must be one of: ${values.join(", ")}`);
  }
  return parsed;
}

function readScores(
  value: unknown,
  path: string,
  context: ValidationContext,
): ReviewScores | undefined {
  const record = readRecord(value, path, context);
  if (!record) return undefined;

  const content = readInteger(required(record, "content", path, context), `${path}.content`, context, 0, 18);
  const language = readInteger(required(record, "language", path, context), `${path}.language`, context, 0, 18);
  return content === undefined || language === undefined
    ? undefined
    : { content, language };
}

function readAnnotation(
  value: unknown,
  path: string,
  context: ValidationContext,
): ReviewAnnotation | undefined {
  const record = readRecord(value, path, context);
  if (!record) return undefined;

  const type = readEnum(
    required(record, "type", path, context),
    `${path}.type`,
    context,
    ANNOTATION_TYPES,
  );

  const startIndex = readInteger(required(record, "startIndex", path, context), `${path}.startIndex`, context, 0);
  const endIndex = readInteger(required(record, "endIndex", path, context), `${path}.endIndex`, context, 0);
  const original = readString(required(record, "original", path, context), `${path}.original`, context);
  const correction = readString(required(record, "correction", path, context), `${path}.correction`, context);
  const explanation = readString(required(record, "explanation", path, context), `${path}.explanation`, context);

  if (startIndex !== undefined && endIndex !== undefined && endIndex <= startIndex) {
    context.add(`${path}.endIndex`, "invalid_value", `${path}.endIndex must be greater than startIndex`);
  }

  if (
    type === undefined ||
    startIndex === undefined ||
    endIndex === undefined ||
    endIndex <= startIndex ||
    original === undefined ||
    correction === undefined ||
    explanation === undefined
  ) {
    return undefined;
  }
  return { type, startIndex, endIndex, original, correction, explanation };
}

function readObjectArray<T>(
  value: unknown,
  path: string,
  context: ValidationContext,
  reader: (item: unknown, itemPath: string, context: ValidationContext) => T | undefined,
): T[] | undefined {
  if (!Array.isArray(value)) {
    context.add(path, "invalid_type", `${path} must be an array`);
    return undefined;
  }
  const parsed = value.map((item, index) => reader(item, `${path}[${index}]`, context));
  return parsed.every((item): item is T => item !== undefined) ? parsed : undefined;
}

function readPair(
  value: unknown,
  path: string,
  context: ValidationContext,
  firstKey: string,
  secondKey: string,
): Record<string, string> | undefined {
  const record = readRecord(value, path, context);
  if (!record) return undefined;
  const first = readString(required(record, firstKey, path, context), `${path}.${firstKey}`, context);
  const second = readString(required(record, secondKey, path, context), `${path}.${secondKey}`, context);
  return first === undefined || second === undefined
    ? undefined
    : { [firstKey]: first, [secondKey]: second };
}

function readAssessment(
  value: unknown,
  path: string,
  context: ValidationContext,
): EssayAssessment | undefined {
  const record = readRecord(value, path, context);
  if (!record) return undefined;
  const scores = readScores(required(record, "scores", path, context), `${path}.scores`, context);

  const bandsPath = `${path}.bands`;
  const bandsRecord = readRecord(required(record, "bands", path, context), bandsPath, context);
  const contentBand = bandsRecord && readEnum(
    required(bandsRecord, "content", bandsPath, context),
    `${bandsPath}.content`,
    context,
    CONTENT_BANDS,
  );
  const languageBand = bandsRecord && readEnum(
    required(bandsRecord, "language", bandsPath, context),
    `${bandsPath}.language`,
    context,
    LANGUAGE_BANDS,
  );
  const completeness = readEnum(
    required(record, "completeness", path, context),
    `${path}.completeness`,
    context,
    STORY_COMPLETENESS,
  );

  const evidencePath = `${path}.evidence`;
  const evidenceRecord = readRecord(required(record, "evidence", path, context), evidencePath, context);
  const contentEvidence = evidenceRecord && readStringArray(
    required(evidenceRecord, "content", evidencePath, context),
    `${evidencePath}.content`,
    context,
    1,
  );
  const languageEvidence = evidenceRecord && readStringArray(
    required(evidenceRecord, "language", evidencePath, context),
    `${evidencePath}.language`,
    context,
    1,
  );

  const contentPath = `${path}.contentBreakdown`;
  const contentRecord = readRecord(required(record, "contentBreakdown", path, context), contentPath, context);
  const relevance = contentRecord && readString(required(contentRecord, "relevance", contentPath, context), `${contentPath}.relevance`, context);
  const development = contentRecord && readString(required(contentRecord, "development", contentPath, context), `${contentPath}.development`, context);
  const plotCoherence = contentRecord && readString(required(contentRecord, "plotCoherence", contentPath, context), `${contentPath}.plotCoherence`, context);
  const engagement = contentRecord && readString(required(contentRecord, "engagement", contentPath, context), `${contentPath}.engagement`, context);

  const languagePath = `${path}.languageBreakdown`;
  const languageRecord = readRecord(required(record, "languageBreakdown", path, context), languagePath, context);
  const grammar = languageRecord && readString(required(languageRecord, "grammar", languagePath, context), `${languagePath}.grammar`, context);
  const vocabulary = languageRecord && readString(required(languageRecord, "vocabulary", languagePath, context), `${languagePath}.vocabulary`, context);
  const spelling = languageRecord && readString(required(languageRecord, "spelling", languagePath, context), `${languagePath}.spelling`, context);
  const organisation = languageRecord && readString(required(languageRecord, "organisation", languagePath, context), `${languagePath}.organisation`, context);
  const summary = readString(required(record, "summary", path, context), `${path}.summary`, context);

  if (!scores || !contentBand || !languageBand || !completeness ||
      !contentEvidence || !languageEvidence ||
      !relevance || !development || !plotCoherence || !engagement ||
      !grammar || !vocabulary || !spelling || !organisation || !summary) {
    return undefined;
  }
  return {
    scores,
    bands: { content: contentBand, language: languageBand },
    completeness,
    evidence: { content: contentEvidence, language: languageEvidence },
    contentBreakdown: { relevance, development, plotCoherence, engagement },
    languageBreakdown: { grammar, vocabulary, spelling, organisation },
    summary,
  };
}

export function parseEssayReviewResult(value: unknown): EssayReviewParseResult {
  const context = new ValidationContext();
  const root = readRecord(value, "$", context);
  if (!root) return { ok: false, errors: context.errors };

  const rawVersion = required(root, "schemaVersion", "$", context);
  let schemaVersion: typeof ESSAY_REVIEW_SCHEMA_VERSION | undefined;
  if (rawVersion !== ESSAY_REVIEW_SCHEMA_VERSION) {
    context.add(
      "$.schemaVersion",
      "invalid_literal",
      `$.schemaVersion must be ${ESSAY_REVIEW_SCHEMA_VERSION}`,
    );
  } else {
    schemaVersion = rawVersion;
  }

  const annotations = readObjectArray(
    required(root, "annotations", "$", context),
    "$.annotations",
    context,
    readAnnotation,
  );

  const studentPath = "$.studentFeedback";
  const studentRecord = readRecord(required(root, "studentFeedback", "$", context), studentPath, context);
  const strengths = studentRecord && readStringArray(
    required(studentRecord, "strengths", studentPath, context),
    `${studentPath}.strengths`,
    context,
    1,
  );
  const nextSteps = studentRecord && readStringArray(
    required(studentRecord, "nextSteps", studentPath, context),
    `${studentPath}.nextSteps`,
    context,
    1,
    3,
  );

  const assessment = readAssessment(required(root, "assessment", "$", context), "$.assessment", context);

  const polishedPath = "$.polishedVersion";
  const polishedRecord = readRecord(required(root, "polishedVersion", "$", context), polishedPath, context);
  const polishedText = polishedRecord && readString(
    required(polishedRecord, "text", polishedPath, context),
    `${polishedPath}.text`,
    context,
  );
  const polishedScores = polishedRecord && readScores(
    required(polishedRecord, "scores", polishedPath, context),
    `${polishedPath}.scores`,
    context,
  );
  const changeSummary = polishedRecord && readStringArray(
    required(polishedRecord, "changeSummary", polishedPath, context),
    `${polishedPath}.changeSummary`,
    context,
    1,
  );
  const preservationJudgement = polishedRecord && readEnum(
    required(polishedRecord, "preservationJudgement", polishedPath, context),
    `${polishedPath}.preservationJudgement`,
    context,
    PRESERVATION_JUDGEMENTS,
  );

  const spellingErrors = readObjectArray(
    required(root, "spellingErrors", "$", context),
    "$.spellingErrors",
    context,
    (item, path, ctx) => {
      const pair = readPair(item, path, ctx, "wrong", "correct");
      return pair ? { wrong: pair.wrong, correct: pair.correct } : undefined;
    },
  );
  const goodPhrases = readObjectArray(
    required(root, "goodPhrases", "$", context),
    "$.goodPhrases",
    context,
    (item, path, ctx) => {
      const pair = readPair(item, path, ctx, "phrase", "category");
      return pair ? { phrase: pair.phrase, category: pair.category } : undefined;
    },
  );

  const qualityPath = "$.qualityMetadata";
  const qualityRecord = readRecord(required(root, "qualityMetadata", "$", context), qualityPath, context);
  const engineVersion = qualityRecord && readString(required(qualityRecord, "engineVersion", qualityPath, context), `${qualityPath}.engineVersion`, context);
  const promptVersion = qualityRecord && readString(required(qualityRecord, "promptVersion", qualityPath, context), `${qualityPath}.promptVersion`, context);
  const model = qualityRecord && readString(required(qualityRecord, "model", qualityPath, context), `${qualityPath}.model`, context);
  const generatedAt = qualityRecord && readString(required(qualityRecord, "generatedAt", qualityPath, context), `${qualityPath}.generatedAt`, context);
  const attempt = qualityRecord && readInteger(required(qualityRecord, "attempt", qualityPath, context), `${qualityPath}.attempt`, context, 1);
  const warnings = qualityRecord && readStringArray(required(qualityRecord, "warnings", qualityPath, context), `${qualityPath}.warnings`, context, 0);

  if (
    context.errors.length > 0 ||
    schemaVersion === undefined ||
    !annotations ||
    !strengths ||
    !nextSteps ||
    !assessment ||
    !polishedText ||
    !polishedScores ||
    !changeSummary ||
    !preservationJudgement ||
    !spellingErrors ||
    !goodPhrases ||
    !engineVersion ||
    !promptVersion ||
    !model ||
    !generatedAt ||
    attempt === undefined ||
    !warnings
  ) {
    return { ok: false, errors: context.errors };
  }

  return {
    ok: true,
    value: {
      schemaVersion,
      annotations,
      studentFeedback: { strengths, nextSteps },
      assessment,
      polishedVersion: {
        text: polishedText,
        scores: polishedScores,
        changeSummary,
        preservationJudgement,
      },
      spellingErrors,
      goodPhrases,
      qualityMetadata: {
        engineVersion,
        promptVersion,
        model,
        generatedAt,
        attempt,
        warnings,
      },
    },
  };
}

export function isEssayReviewResult(value: unknown): value is EssayReviewResultV2 {
  return parseEssayReviewResult(value).ok;
}
