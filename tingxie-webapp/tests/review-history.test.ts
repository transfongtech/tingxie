import assert from "node:assert/strict";
import test from "node:test";

import {
  orderReviewVersions,
  summarizeReviewChange,
  type ReviewHistorySource,
} from "../lib/review-history";

function version(
  versionNumber: number,
  overrides: Partial<ReviewHistorySource> = {},
): ReviewHistorySource {
  return {
    id: versionNumber,
    versionNumber,
    status: "success",
    isCurrent: versionNumber === 2,
    contentScore: 12,
    languageScore: 13,
    totalScore: 25,
    summary: "Keep developing the ending.",
    annotations: "[]",
    reviewResultJson: null,
    qualityMetadataJson: null,
    failureMessage: null,
    engineVersion: "review-core-2",
    createdAt: new Date("2026-08-30T00:00:00Z"),
    ...overrides,
  };
}

test("review versions are ordered newest first without mutating input", () => {
  const input = [version(1), version(3), version(2)];
  assert.deepEqual(
    orderReviewVersions(input).map((item) => item.versionNumber),
    [3, 2, 1],
  );
  assert.deepEqual(input.map((item) => item.versionNumber), [1, 3, 2]);
});

test("summary comparison reports score, feedback, next-step and annotation deltas", () => {
  const previous = version(1, {
    contentScore: 10,
    languageScore: 14,
    totalScore: 24,
    summary: "Clarify the ending.",
    annotations: JSON.stringify([
      { type: "grammar" },
      { type: "spelling" },
    ]),
    reviewResultJson: JSON.stringify({
      studentFeedback: { nextSteps: ["Check tense."] },
    }),
  });
  const current = version(2, {
    contentScore: 13,
    languageScore: 13,
    totalScore: 26,
    summary: "Develop the ending.",
    annotations: JSON.stringify([
      { type: "grammar" },
      { type: "vocabulary" },
      { type: "vocabulary" },
    ]),
    reviewResultJson: JSON.stringify({
      studentFeedback: { nextSteps: ["Add sensory details."] },
    }),
  });

  assert.deepEqual(summarizeReviewChange(current, previous), {
    contentDelta: 3,
    languageDelta: -1,
    totalDelta: 2,
    feedbackChanged: true,
    nextStepsChanged: true,
    annotationDeltas: {
      spelling: -1,
      grammar: 0,
      structure: 0,
      vocabulary: 2,
    },
  });
});

test("next-step comparison reports unchanged persisted Review 2.0 steps", () => {
  const reviewResultJson = JSON.stringify({
    studentFeedback: { nextSteps: ["Check tense.", "Vary openings."] },
  });

  assert.equal(
    summarizeReviewChange(
      version(2, {
        reviewResultJson,
        qualityMetadataJson: JSON.stringify({
          studentFeedback: { nextSteps: ["Conflicting legacy step."] },
        }),
      }),
      version(1, { reviewResultJson }),
    ).nextStepsChanged,
    false,
  );
});

test("next-step comparison reports persisted Review 2.0 additions and removals", () => {
  const noSteps = JSON.stringify({
    studentFeedback: { nextSteps: [] },
  });
  const oneStep = JSON.stringify({
    studentFeedback: { nextSteps: ["Add sensory details."] },
  });

  assert.equal(
    summarizeReviewChange(
      version(2, { reviewResultJson: oneStep }),
      version(1, { reviewResultJson: noSteps }),
    ).nextStepsChanged,
    true,
  );
  assert.equal(
    summarizeReviewChange(
      version(2, { reviewResultJson: noSteps }),
      version(1, { reviewResultJson: oneStep }),
    ).nextStepsChanged,
    true,
  );
});

test("next-step comparison falls back to legacy quality metadata", () => {
  const legacyStep = (step: string) =>
    JSON.stringify({ studentFeedback: { nextSteps: [step] } });

  assert.equal(
    summarizeReviewChange(
      version(2, {
        reviewResultJson: null,
        qualityMetadataJson: legacyStep("New legacy step."),
      }),
      version(1, {
        reviewResultJson: "{invalid",
        qualityMetadataJson: legacyStep("Old legacy step."),
      }),
    ).nextStepsChanged,
    true,
  );
});
