import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import {
  beginEssayReview,
  deserializeEssayFeedback,
  EssayReviewAlreadyInProgressError,
  saveSuccessfulEssayFeedback,
  saveTerminalEssayReviewFailure,
} from "../lib/essay-feedback-persistence";
import type { EssayReviewResult } from "../lib/essay-types";

type FeedbackRow = Record<string, unknown> & {
  id: number;
  submissionId: number;
  versionNumber: number;
  isCurrent: boolean;
  status: string;
};

function mockDb() {
  const feedbacks: FeedbackRow[] = [];
  const submissionStatuses = new Map<number, string>([[7, "submitted"]]);
  const reviewLeases = new Map<number, Date | null>([[7, null]]);
  const reviewLeaseIds = new Map<number, string | null>([[7, null]]);
  const tx = {
    essayFeedback: {
      findFirst: async ({ where }: { where: { submissionId: number; isCurrent?: boolean; status?: string } }) => {
        const rows = feedbacks
          .filter((row) =>
            row.submissionId === where.submissionId &&
            (where.isCurrent === undefined || row.isCurrent === where.isCurrent) &&
            (where.status === undefined || row.status === where.status))
          .sort((a, b) => b.versionNumber - a.versionNumber);
        return rows[0]
          ? { versionNumber: rows[0].versionNumber }
          : null;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { submissionId: number; isCurrent: boolean };
        data: { isCurrent: boolean };
      }) => {
        for (const row of feedbacks) {
          if (
            row.submissionId === where.submissionId &&
            row.isCurrent === where.isCurrent
          ) {
            row.isCurrent = data.isCurrent;
          }
        }
      },
      create: async ({ data }: { data: Omit<FeedbackRow, "id"> }) => {
        const row = { ...data, id: feedbacks.length + 1 } as FeedbackRow;
        feedbacks.push(row);
        return row;
      },
    },
    essaySubmission: {
      findFirst: async ({
        where,
      }: {
        where: { id: number; status: string; reviewLeaseId: string };
      }) =>
        submissionStatuses.get(where.id) === where.status &&
        reviewLeaseIds.get(where.id) === where.reviewLeaseId
          ? { id: where.id }
          : null,
      updateMany: async ({
        where,
        data,
      }: {
        where: {
          id: number;
          OR: Array<
            | { status: { not: string } }
            | { reviewLeaseExpiresAt: null }
            | { reviewLeaseExpiresAt: { lte: Date } }
          >;
        };
        data: {
          status: string;
          reviewLeaseId: string;
          reviewLeaseExpiresAt: Date;
        };
      }) => {
        const status = submissionStatuses.get(where.id);
        const lease = reviewLeases.get(where.id);
        const canAcquire =
          status !== "reviewing" ||
          lease === null ||
          (lease !== undefined &&
            lease <=
              (where.OR.find(
                (condition) =>
                  "reviewLeaseExpiresAt" in condition &&
                  condition.reviewLeaseExpiresAt !== null,
              ) as { reviewLeaseExpiresAt: { lte: Date } }).reviewLeaseExpiresAt
                .lte);
        if (!canAcquire) return { count: 0 };
        submissionStatuses.set(where.id, data.status);
        reviewLeaseIds.set(where.id, data.reviewLeaseId);
        reviewLeases.set(where.id, data.reviewLeaseExpiresAt);
        return { count: 1 };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: number };
        data: {
          status: string;
          reviewLeaseId?: null;
          reviewLeaseExpiresAt?: null;
        };
      }) => {
        submissionStatuses.set(where.id, data.status);
        if (data.reviewLeaseId === null) reviewLeaseIds.set(where.id, null);
        if (data.reviewLeaseExpiresAt === null) reviewLeases.set(where.id, null);
        return { id: where.id, status: data.status };
      },
    },
  };
  const db = {
    $transaction: async (operation: (client: typeof tx) => unknown) =>
      operation(tx),
  } as unknown as Pick<PrismaClient, "$transaction">;
  return {
    db,
    feedbacks,
    submissionStatuses,
    reviewLeases,
    reviewLeaseIds,
  };
}

const review: EssayReviewResult = {
  annotations: [],
  polishedText: "Polished.",
  scores: {
    content: 12,
    language: 13,
    contentBreakdown: {
      relevance: "Good",
      development: "Good",
      plotCoherence: "Good",
      engagement: "Good",
    },
    languageBreakdown: {
      grammar: "Good",
      vocabulary: "Good",
      spelling: "Good",
      organisation: "Good",
    },
  },
  summary: "Good work.",
  spellingErrors: [],
};

const reviewV2: EssayReviewResult = {
  ...review,
  schemaVersion: 2,
  studentFeedback: {
    strengths: ["A clear opening."],
    nextSteps: ["Add sensory detail."],
  },
  assessment: {
    scores: { content: 12, language: 13 },
    bands: { content: "C3", language: "L3" },
    completeness: "complete",
    evidence: {
      content: ["The problem is resolved."],
      language: ["Dialogue is clearly punctuated."],
    },
    contentBreakdown: review.scores.contentBreakdown,
    languageBreakdown: review.scores.languageBreakdown,
    summary: "Good work.",
  },
  polishedVersion: {
    text: "Polished.",
    scores: { content: 14, language: 14 },
    changeSummary: ["Corrected tense consistency."],
    preservationJudgement: "preserved",
  },
  goodPhrases: [{ phrase: "bright morning", category: "description" }],
  qualityMetadata: {
    engineVersion: "review-core-2.0.0",
    promptVersion: "essay-review-2",
    model: "test-model",
    generatedAt: "2026-08-30T00:00:00.000Z",
    attempt: 1,
    warnings: [],
  },
};

test("successful regrades are sequential and atomically switch current feedback", async () => {
  const state = mockDb();
  await beginEssayReview(7, state.db);
  await saveSuccessfulEssayFeedback(7, review, { engineVersion: "2" }, state.db);
  await saveSuccessfulEssayFeedback(7, review, { engineVersion: "3" }, state.db);

  assert.deepEqual(
    state.feedbacks.map(({ versionNumber, isCurrent, status }) => ({
      versionNumber,
      isCurrent,
      status,
    })),
    [
      { versionNumber: 1, isCurrent: false, status: "success" },
      { versionNumber: 2, isCurrent: true, status: "success" },
    ],
  );
  assert.equal(state.submissionStatuses.get(7), "reviewed");
});

test("terminal failure records a version without displacing current success", async () => {
  const state = mockDb();
  await saveSuccessfulEssayFeedback(7, review, {}, state.db);
  await saveTerminalEssayReviewFailure(
    7,
    { code: "provider_timeout", message: "Provider timed out" },
    { attemptCount: 3, inputFingerprint: "sha256:abc" },
    state.db,
  );

  assert.equal(state.feedbacks[0].isCurrent, true);
  assert.equal(state.feedbacks[1].versionNumber, 2);
  assert.equal(state.feedbacks[1].isCurrent, false);
  assert.equal(state.feedbacks[1].failureCode, "provider_timeout");
  assert.equal(state.submissionStatuses.get(7), "reviewed");
});

test("concurrent review request is rejected without starting a duplicate", async () => {
  const state = mockDb();
  const now = new Date("2026-08-30T00:00:00.000Z");
  await beginEssayReview(7, state.db, { now, leaseMs: 60_000 });
  await assert.rejects(
    beginEssayReview(7, state.db, {
      now: new Date(now.getTime() + 30_000),
      leaseMs: 60_000,
    }),
    EssayReviewAlreadyInProgressError,
  );
  assert.equal(state.feedbacks.length, 0);
  assert.equal(state.submissionStatuses.get(7), "reviewing");
});

test("stale review lease is recovered atomically", async () => {
  const state = mockDb();
  const now = new Date("2026-08-30T00:00:00.000Z");
  const stale = await beginEssayReview(7, state.db, {
    now,
    leaseMs: 1_000,
    leaseId: "stale-attempt",
  });
  const recovered = await beginEssayReview(7, state.db, {
    now: new Date(now.getTime() + 1_001),
    leaseMs: 60_000,
    leaseId: "recovered-attempt",
  });
  assert.equal(
    state.reviewLeases.get(7)?.toISOString(),
    "2026-08-30T00:01:01.001Z",
  );
  await assert.rejects(
    saveSuccessfulEssayFeedback(
      7,
      review,
      { reviewLeaseId: stale.leaseId },
      state.db,
    ),
    EssayReviewAlreadyInProgressError,
  );
  await saveSuccessfulEssayFeedback(
    7,
    review,
    { reviewLeaseId: recovered.leaseId },
    state.db,
  );
  assert.equal(state.feedbacks.length, 1);
});

test("complete Review 2.0 result survives persistence round-trip", async () => {
  const state = mockDb();
  await saveSuccessfulEssayFeedback(7, reviewV2, {}, state.db);
  const restored = deserializeEssayFeedback(
    state.feedbacks[0] as unknown as Parameters<
      typeof deserializeEssayFeedback
    >[0],
  );
  assert.equal(restored.schemaVersion, 2);
  assert.deepEqual(restored.studentFeedback, reviewV2.studentFeedback);
  assert.deepEqual(restored.assessment, reviewV2.assessment);
  assert.deepEqual(restored.polishedVersion, reviewV2.polishedVersion);
  assert.deepEqual(restored.qualityMetadata, reviewV2.qualityMetadata);
});

test("legacy columns reconstruct a legacy review", () => {
  const restored = deserializeEssayFeedback({
    reviewResultJson: null,
    annotations: "[]",
    polishedText: "Legacy polished.",
    contentScore: 9,
    languageScore: 8,
    summary: "Legacy summary.",
    spellingErrorWords: '[{"wrong":"recieve","correct":"receive"}]',
    contentBreakdownJson: JSON.stringify(review.scores.contentBreakdown),
    languageBreakdownJson: JSON.stringify(review.scores.languageBreakdown),
  });
  assert.equal(restored.schemaVersion, undefined);
  assert.equal(restored.polishedText, "Legacy polished.");
  assert.equal(restored.scores.content, 9);
  assert.equal(restored.spellingErrors[0].correct, "receive");
});

test("initial failure remains recoverable when no successful review exists", async () => {
  const state = mockDb();
  await beginEssayReview(7, state.db);
  await saveTerminalEssayReviewFailure(
    7,
    { code: "provider_timeout", message: "Provider timed out" },
    {},
    state.db,
  );
  assert.equal(state.submissionStatuses.get(7), "review_failed");
  state.submissionStatuses.set(7, "submitted");
  await beginEssayReview(7, state.db);
  assert.equal(state.submissionStatuses.get(7), "reviewing");
});
