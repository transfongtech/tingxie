import assert from "node:assert/strict";
import test from "node:test";

import {
  EssayReviewProviderError,
  EssayReviewQualityError,
} from "../lib/essay-review";
import {
  EssayReviewPersistenceError,
  executeEssayReviewPipeline,
  type EssayReviewPipelineDependencies,
} from "../lib/essay-review/review-pipeline";
import type { ResolvedReviewInput } from "../lib/essay-review/review-request";
import type { EssayReviewResult } from "../lib/essay-types";

const review = {
  annotations: [],
  polishedText: "Polished composition.",
  scores: {
    content: 12,
    language: 13,
    contentBreakdown: {
      relevance: "Relevant",
      development: "Developed",
      plotCoherence: "Coherent",
      engagement: "Engaging",
    },
    languageBreakdown: {
      grammar: "Controlled",
      vocabulary: "Suitable",
      spelling: "Accurate",
      organisation: "Clear",
    },
  },
  summary: "Good work.",
  spellingErrors: [],
  qualityMetadata: {
    engineVersion: "review-core-2.0.0",
    promptVersion: "essay-review-2",
    model: "gemini-2.5-flash",
    generatedAt: "2026-08-30T00:00:00.000Z",
    attempt: 1,
    warnings: [],
  },
} satisfies EssayReviewResult & { qualityMetadata: Record<string, unknown> };

const submissionInput: ResolvedReviewInput = {
  mode: "submission",
  submissionId: 7,
  essayText: "The stored authoritative composition.",
  promptTitle: "A challenge",
  promptDescription: "Write a complete story.",
  imagePaths: ["/essay_prompts/7/one.png"],
};

function dependencies(overrides: Partial<EssayReviewPipelineDependencies> = {}) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const wrap = <T extends (...args: never[]) => unknown>(name: string, fn: T) =>
    ((...args: Parameters<T>) => {
      calls.push({ name, args });
      return fn(...args);
    }) as T;
  const deps: EssayReviewPipelineDependencies = {
    review: wrap("review", async () => review),
    begin: wrap("begin", async () => undefined),
    saveSuccess: wrap("saveSuccess", async () => undefined),
    saveFailure: wrap("saveFailure", async () => undefined),
    ...overrides,
  };
  return { calls, deps };
}

test("submission success begins, reviews authoritative input, and persists complete metadata", async () => {
  const state = dependencies();
  const result = await executeEssayReviewPipeline(submissionInput, [], state.deps);

  assert.equal(result, review);
  assert.deepEqual(state.calls.map(({ name }) => name), [
    "begin",
    "review",
    "saveSuccess",
  ]);
  assert.equal(state.calls[1].args[0], submissionInput.essayText);
  const metadata = state.calls[2].args[2] as Record<string, unknown>;
  assert.equal(metadata.engineVersion, "review-core-2.0.0");
  assert.equal(metadata.promptVersion, "essay-review-2");
  assert.equal(metadata.rubricVersion, "psle-continuous-writing-2025");
  assert.equal(metadata.provider, "google-genai");
  assert.equal(metadata.model, "gemini-2.5-flash");
  assert.equal(metadata.attemptCount, 1);
  assert.match(String(metadata.inputFingerprint), /^sha256:[a-f0-9]{64}$/);
  assert.equal(metadata.qualityMetadata, review.qualityMetadata);
});

test("a quality-gate recovery persists the second attempt", async () => {
  const recovered = {
    ...review,
    qualityMetadata: { ...review.qualityMetadata, attempt: 2 },
  };
  const state = dependencies({ review: async () => recovered });
  await executeEssayReviewPipeline(submissionInput, [], state.deps);
  const saved = state.calls.find(({ name }) => name === "saveSuccess");
  assert.equal((saved?.args[2] as Record<string, unknown>).attemptCount, 2);
});

test("passes the acquired lease identity to persistence", async () => {
  const state = dependencies({
    begin: async () => ({
      leaseId: "lease-7",
      leaseExpiresAt: new Date("2026-08-30T00:10:00.000Z"),
    }),
  });
  await executeEssayReviewPipeline(submissionInput, [], state.deps);
  const saved = state.calls.find(({ name }) => name === "saveSuccess");
  assert.equal(
    (saved?.args[2] as Record<string, unknown>).reviewLeaseId,
    "lease-7",
  );
});

test("terminal quality failure is persisted and returned to the route layer", async () => {
  const qualityError = new EssayReviewQualityError(
    [{ code: "ANNOTATION_UNRESOLVED", path: "annotations[0]", message: "Missing" }],
    2,
  );
  const state = dependencies({ review: async () => { throw qualityError; } });

  await assert.rejects(
    executeEssayReviewPipeline(submissionInput, [], state.deps),
    (error) => error === qualityError,
  );
  const failure = state.calls.find(({ name }) => name === "saveFailure");
  assert.equal((failure?.args[1] as { code: string }).code, "REVIEW_QUALITY_FAILED");
  assert.equal((failure?.args[2] as { attemptCount: number }).attemptCount, 2);
});

test("provider failure is persisted without a success save", async () => {
  const providerError = new EssayReviewProviderError(new Error("offline"));
  const state = dependencies({ review: async () => { throw providerError; } });

  await assert.rejects(
    executeEssayReviewPipeline(submissionInput, [], state.deps),
    (error) => error === providerError,
  );
  assert.equal(state.calls.some(({ name }) => name === "saveSuccess"), false);
  assert.equal(
    (state.calls.find(({ name }) => name === "saveFailure")?.args[1] as { code: string }).code,
    "REVIEW_PROVIDER_FAILED",
  );
});

test("success persistence failure records terminal failure and never reports success", async () => {
  const state = dependencies({
    saveSuccess: async () => { throw new Error("disk full"); },
  });

  await assert.rejects(
    executeEssayReviewPipeline(submissionInput, [], state.deps),
    (error) =>
      error instanceof EssayReviewPersistenceError && error.phase === "success",
  );
  assert.equal(
    (state.calls.find(({ name }) => name === "saveFailure")?.args[1] as { code: string }).code,
    "REVIEW_STORAGE_FAILED",
  );
});

test("preview reviews but never invokes any persistence operation", async () => {
  const state = dependencies();
  const preview: ResolvedReviewInput = {
    mode: "preview",
    essayText: "A preview composition.",
    promptTitle: "Preview",
    imagePaths: [],
  };

  await executeEssayReviewPipeline(preview, [], state.deps);
  assert.deepEqual(state.calls.map(({ name }) => name), ["review"]);
});
