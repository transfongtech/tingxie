export const ANNOTATION_TYPES = [
  "spelling",
  "grammar",
  "structure",
  "vocabulary",
] as const;

type AnnotationType = (typeof ANNOTATION_TYPES)[number];

export interface ReviewHistorySource {
  id: number;
  versionNumber: number;
  status: string;
  isCurrent: boolean;
  contentScore: number;
  languageScore: number;
  totalScore: number;
  summary: string;
  annotations: string;
  reviewResultJson: string | null;
  qualityMetadataJson: string | null;
  failureMessage: string | null;
  engineVersion: string;
  createdAt: Date;
}

export interface ReviewChangeSummary {
  contentDelta: number;
  languageDelta: number;
  totalDelta: number;
  feedbackChanged: boolean;
  nextStepsChanged: boolean;
  annotationDeltas: Record<AnnotationType, number>;
}

export function orderReviewVersions<T extends { versionNumber: number }>(
  versions: T[],
): T[] {
  return [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
}

function annotationCounts(json: string): Record<AnnotationType, number> {
  const counts = Object.fromEntries(
    ANNOTATION_TYPES.map((type) => [type, 0]),
  ) as Record<AnnotationType, number>;
  try {
    const annotations = JSON.parse(json);
    if (Array.isArray(annotations)) {
      for (const annotation of annotations) {
        if (
          annotation &&
          ANNOTATION_TYPES.includes(annotation.type as AnnotationType)
        ) {
          counts[annotation.type as AnnotationType]++;
        }
      }
    }
  } catch {}
  return counts;
}

function nextStepsFromJson(json: string | null): string[] | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("studentFeedback" in parsed)
    ) {
      return null;
    }
    const studentFeedback: unknown = parsed.studentFeedback;
    if (
      typeof studentFeedback !== "object" ||
      studentFeedback === null ||
      !("nextSteps" in studentFeedback) ||
      !Array.isArray(studentFeedback.nextSteps)
    ) {
      return null;
    }
    return studentFeedback.nextSteps.filter(
      (step: unknown): step is string => typeof step === "string",
    );
  } catch {
    return null;
  }
}

function nextSteps(source: ReviewHistorySource): string[] {
  return (
    nextStepsFromJson(source.reviewResultJson) ??
    nextStepsFromJson(source.qualityMetadataJson) ??
    []
  );
}

export function summarizeReviewChange(
  current: ReviewHistorySource,
  previous: ReviewHistorySource,
): ReviewChangeSummary {
  const currentAnnotations = annotationCounts(current.annotations);
  const previousAnnotations = annotationCounts(previous.annotations);
  return {
    contentDelta: current.contentScore - previous.contentScore,
    languageDelta: current.languageScore - previous.languageScore,
    totalDelta: current.totalScore - previous.totalScore,
    feedbackChanged: current.summary.trim() !== previous.summary.trim(),
    nextStepsChanged:
      JSON.stringify(nextSteps(current)) !==
      JSON.stringify(nextSteps(previous)),
    annotationDeltas: Object.fromEntries(
      ANNOTATION_TYPES.map((type) => [
        type,
        currentAnnotations[type] - previousAnnotations[type],
      ]),
    ) as Record<AnnotationType, number>,
  };
}
