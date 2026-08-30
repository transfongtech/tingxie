import assert from "node:assert/strict";
import test from "node:test";

import { buildEssayFeedbackViewModel } from "../components/essay/feedback-view-model";
import type { EssayReviewResult } from "../lib/essay-types";

const legacyReview: EssayReviewResult = {
  annotations: [],
  polishedText: "A polished story.",
  scores: {
    content: 11,
    language: 10,
    contentBreakdown: {
      relevance: "Relevant.",
      development: "Developing.",
      plotCoherence: "Mostly clear.",
      engagement: "Interesting.",
    },
    languageBreakdown: {
      grammar: "Mostly accurate.",
      vocabulary: "Suitable.",
      spelling: "Mostly accurate.",
      organisation: "Clear.",
    },
  },
  summary: "Keep writing — your story has a clear idea.",
  spellingErrors: [],
};

test("keeps legacy feedback visible without inventing structured feedback", () => {
  const feedback = buildEssayFeedbackViewModel(legacyReview);

  assert.equal(feedback.isLegacy, true);
  assert.deepEqual(feedback.strengths, []);
  assert.deepEqual(feedback.nextSteps, []);
  assert.equal(feedback.summary, legacyReview.summary);
  assert.equal(feedback.assessment, undefined);
  assert.equal(feedback.qualityMetadata, undefined);
});

test("presents a concise child-first subset and keeps parent detail data", () => {
  const review: EssayReviewResult = {
    ...legacyReview,
    schemaVersion: 2,
    studentFeedback: {
      strengths: [" Clear opening ", "Strong ending", "Good dialogue", "Extra item"],
      nextSteps: ["Check tense", "Add detail", "Vary sentences"],
    },
    assessment: {
      scores: { content: 13, language: 12 },
      bands: { content: "C3", language: "L3" },
      completeness: "complete",
      evidence: {
        content: ["The ending resolves the problem."],
        language: ["Dialogue is punctuated accurately."],
      },
      contentBreakdown: legacyReview.scores.contentBreakdown,
      languageBreakdown: legacyReview.scores.languageBreakdown,
      summary: "You built a complete story. Keep practising!",
    },
    qualityMetadata: {
      engineVersion: "review-core-2.0.0",
      promptVersion: "essay-review-2",
      model: "test-model",
      generatedAt: "2026-08-30T00:00:00.000Z",
      attempt: 1,
      warnings: [],
    },
  };

  const feedback = buildEssayFeedbackViewModel(review);

  assert.equal(feedback.isLegacy, false);
  assert.deepEqual(feedback.strengths, ["Clear opening", "Strong ending", "Good dialogue"]);
  assert.deepEqual(feedback.nextSteps, ["Check tense", "Add detail", "Vary sentences"]);
  assert.equal(feedback.summary, review.assessment?.summary);
  assert.equal(feedback.assessment, review.assessment);
  assert.equal(feedback.qualityMetadata, review.qualityMetadata);
});
