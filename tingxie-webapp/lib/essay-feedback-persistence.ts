import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import type { EssayReviewResult } from "@/lib/essay-types";
import {
  parseEssayReviewResult,
  type EssayReviewResultV2,
  type ReviewAnnotation,
} from "@/lib/essay-review/schema";

export const ESSAY_SUBMISSION_STATUSES = [
  "submitted",
  "reviewing",
  "reviewed",
  "review_failed",
] as const;

export type EssaySubmissionStatus = (typeof ESSAY_SUBMISSION_STATUSES)[number];

export interface ReviewPersistenceMetadata {
  engineVersion?: string;
  promptVersion?: string;
  rubricVersion?: string;
  provider?: string;
  model?: string;
  attemptCount?: number;
  inputFingerprint?: string;
  qualityMetadata?: unknown;
  reviewLeaseId?: string;
}

export interface TerminalReviewFailure {
  code: string;
  message: string;
}

type TransactionHost = Pick<PrismaClient, "$transaction">;
export const DEFAULT_REVIEW_LEASE_MS = 10 * 60 * 1000;

export interface BeginEssayReviewOptions {
  now?: Date;
  leaseMs?: number;
  leaseId?: string;
}

export interface StoredEssayFeedback {
  annotations: string;
  polishedText: string;
  contentScore: number;
  languageScore: number;
  summary: string;
  spellingErrorWords: string | null;
  contentBreakdownJson: string | null;
  languageBreakdownJson: string | null;
  reviewResultJson: string | null;
}

export class EssayReviewAlreadyInProgressError extends Error {
  readonly code = "REVIEW_ALREADY_IN_PROGRESS";

  constructor() {
    super("A review is already in progress for this submission.");
    this.name = "EssayReviewAlreadyInProgressError";
  }
}

function metadataData(metadata: ReviewPersistenceMetadata) {
  return {
    annotations: "[]",
    polishedText: "",
    contentScore: 0,
    languageScore: 0,
    totalScore: 0,
    summary: "",
    engineVersion: metadata.engineVersion ?? "legacy",
    promptVersion: metadata.promptVersion ?? "legacy",
    rubricVersion: metadata.rubricVersion ?? "legacy",
    provider: metadata.provider ?? "legacy",
    model: metadata.model ?? "legacy",
    attemptCount: Math.max(1, metadata.attemptCount ?? 1),
    inputFingerprint: metadata.inputFingerprint,
    qualityMetadataJson:
      metadata.qualityMetadata === undefined
        ? undefined
        : JSON.stringify(metadata.qualityMetadata),
  };
}

function serializeReviewResult(feedback: EssayReviewResult): string | null {
  const parsed = parseEssayReviewResult(feedback);
  return parsed.ok ? JSON.stringify(parsed.value) : null;
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function fromV2(review: EssayReviewResultV2): EssayReviewResult {
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

/** Reconstructs either the complete 2.0 result or a typed legacy result. */
export function deserializeEssayFeedback(
  stored: StoredEssayFeedback,
): EssayReviewResult {
  if (stored.reviewResultJson) {
    try {
      const parsed = parseEssayReviewResult(JSON.parse(stored.reviewResultJson));
      if (parsed.ok) return fromV2(parsed.value);
    } catch {}
  }

  return {
    annotations: parseJson<ReviewAnnotation[]>(stored.annotations, []),
    polishedText: stored.polishedText,
    scores: {
      content: stored.contentScore,
      language: stored.languageScore,
      contentBreakdown: parseJson(stored.contentBreakdownJson, {
        relevance: "",
        development: "",
        plotCoherence: "",
        engagement: "",
      }),
      languageBreakdown: parseJson(stored.languageBreakdownJson, {
        grammar: "",
        vocabulary: "",
        spelling: "",
        organisation: "",
      }),
    },
    summary: stored.summary,
    spellingErrors: parseJson(stored.spellingErrorWords, []),
  };
}

async function nextVersion(tx: Prisma.TransactionClient, submissionId: number) {
  const latest = await tx.essayFeedback.findFirst({
    where: { submissionId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true },
  });
  return (latest?.versionNumber ?? 0) + 1;
}

export async function beginEssayReview(
  submissionId: number,
  db: TransactionHost,
  options: BeginEssayReviewOptions = {},
) {
  const now = options.now ?? new Date();
  const leaseMs = options.leaseMs ?? DEFAULT_REVIEW_LEASE_MS;
  const leaseId = options.leaseId ?? randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);
  return db.$transaction(async (tx) => {
    const result = await tx.essaySubmission.updateMany({
      where: {
        id: submissionId,
        OR: [
          { status: { not: "reviewing" } },
          { reviewLeaseExpiresAt: null },
          { reviewLeaseExpiresAt: { lte: now } },
        ],
      },
      data: {
        status: "reviewing",
        reviewLeaseId: leaseId,
        reviewLeaseExpiresAt: leaseExpiresAt,
      },
    });
    if (result.count !== 1) {
      throw new EssayReviewAlreadyInProgressError();
    }
    return { leaseId, leaseExpiresAt };
  });
}

async function assertLeaseOwner(
  tx: Prisma.TransactionClient,
  submissionId: number,
  leaseId: string | undefined,
) {
  if (!leaseId) return;
  const active = await tx.essaySubmission.findFirst({
    where: { id: submissionId, status: "reviewing", reviewLeaseId: leaseId },
    select: { id: true },
  });
  if (!active) throw new EssayReviewAlreadyInProgressError();
}

export async function saveSuccessfulEssayFeedback(
  submissionId: number,
  feedbackData: EssayReviewResult,
  metadata: ReviewPersistenceMetadata,
  db: TransactionHost,
) {
  return db.$transaction(async (tx) => {
    await assertLeaseOwner(tx, submissionId, metadata.reviewLeaseId);
    const versionNumber = await nextVersion(tx, submissionId);
    const anns = feedbackData.annotations ?? [];
    const base = metadataData(metadata);

    await tx.essayFeedback.updateMany({
      where: { submissionId, isCurrent: true },
      data: { isCurrent: false },
    });

    const feedback = await tx.essayFeedback.create({
      data: {
        ...base,
        qualityMetadataJson:
          feedbackData.qualityMetadata === undefined
            ? base.qualityMetadataJson
            : JSON.stringify(feedbackData.qualityMetadata),
        reviewResultJson: serializeReviewResult(feedbackData),
        submissionId,
        versionNumber,
        isCurrent: true,
        status: "success",
        annotations: JSON.stringify(anns),
        polishedText: feedbackData.polishedText ?? "",
        contentScore: feedbackData.scores?.content ?? 0,
        languageScore: feedbackData.scores?.language ?? 0,
        totalScore:
          (feedbackData.scores?.content ?? 0) +
          (feedbackData.scores?.language ?? 0),
        spellingErrors: anns.filter((a) => a.type === "spelling").length,
        grammarErrors: anns.filter((a) => a.type === "grammar").length,
        structureErrors: anns.filter((a) => a.type === "structure").length,
        vocabSuggestions: anns.filter((a) => a.type === "vocabulary").length,
        summary: feedbackData.summary ?? "",
        spellingErrorWords: JSON.stringify(feedbackData.spellingErrors ?? []),
        contentBreakdownJson: feedbackData.scores?.contentBreakdown
          ? JSON.stringify(feedbackData.scores.contentBreakdown)
          : null,
        languageBreakdownJson: feedbackData.scores?.languageBreakdown
          ? JSON.stringify(feedbackData.scores.languageBreakdown)
          : null,
      },
    });

    await tx.essaySubmission.update({
      where: { id: submissionId },
      data: {
        status: "reviewed",
        reviewLeaseId: null,
        reviewLeaseExpiresAt: null,
      },
    });
    return feedback;
  });
}

export async function saveTerminalEssayReviewFailure(
  submissionId: number,
  failure: TerminalReviewFailure,
  metadata: ReviewPersistenceMetadata,
  db: TransactionHost,
) {
  return db.$transaction(async (tx) => {
    await assertLeaseOwner(tx, submissionId, metadata.reviewLeaseId);
    const versionNumber = await nextVersion(tx, submissionId);
    const base = metadataData(metadata);
    const currentSuccess = await tx.essayFeedback.findFirst({
      where: { submissionId, isCurrent: true, status: "success" },
      select: { id: true },
    });
    const feedback = await tx.essayFeedback.create({
      data: {
        ...base,
        submissionId,
        versionNumber,
        isCurrent: false,
        status: "failed",
        failureCode: failure.code,
        failureMessage: failure.message,
      },
    });
    await tx.essaySubmission.update({
      where: { id: submissionId },
      data: {
        status: currentSuccess ? "reviewed" : "review_failed",
        reviewLeaseId: null,
        reviewLeaseExpiresAt: null,
      },
    });
    return feedback;
  });
}
