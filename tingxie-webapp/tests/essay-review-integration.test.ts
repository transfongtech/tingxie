import assert from "node:assert/strict";
import test from "node:test";

import { normalizeEssayReview } from "../lib/essay-review";

const annotation = (startIndex: number) => ({
  type: "grammar",
  startIndex,
  endIndex: startIndex + 3,
  original: "ran",
  correction: "raced",
  explanation: "Use a more precise verb.",
});

function rawReview() {
  return {
    schemaVersion: 2,
    annotations: [annotation(99), annotation(99)],
    studentFeedback: {
      strengths: ["You created a clear action."],
      nextSteps: ["Add a complete resolution."],
    },
    assessment: {
      scores: { content: 17, language: 12 },
      bands: { content: "C1", language: "L3" },
      completeness: "incomplete",
      evidence: {
        content: ["The action stops without a resolution."],
        language: ["The repeated verb is clear but basic."],
      },
      contentBreakdown: {
        relevance: "Relevant.",
        development: "Incomplete.",
        plotCoherence: "The sequence is clear.",
        engagement: "The action creates interest.",
      },
      languageBreakdown: {
        grammar: "Mostly controlled.",
        vocabulary: "Basic but accurate.",
        spelling: "Accurate.",
        organisation: "Simple.",
      },
      summary: "A promising opening that needs an ending.",
    },
    polishedVersion: {
      text: "I raced, then I raced home.",
      scores: { content: 14, language: 15 },
      changeSummary: ["Corrected wording while retaining the action."],
      preservationJudgement: "minor_changes",
    },
    spellingErrors: [],
    goodPhrases: [{ phrase: "raced home", category: "urgency" }],
    qualityMetadata: {
      engineVersion: "provider-value",
      promptVersion: "provider-value",
      model: "provider-value",
      generatedAt: "2026-08-30T00:00:00.000Z",
      attempt: 1,
      warnings: [],
    },
  };
}

test("normalizes repeated annotations, rubric caps, and compatibility aliases", () => {
  const result = normalizeEssayReview("I ran, then I ran.", rawReview());

  assert.deepEqual(result.annotations.map(({ startIndex }) => startIndex), [2, 14]);
  assert.equal(result.assessment.scores.content, 9);
  assert.equal(result.assessment.bands.content, "C4");
  assert.equal(result.assessment.bands.language, "L3");
  assert.equal(result.polishedText, result.polishedVersion.text);
  assert.equal(result.scores.content, result.assessment.scores.content);
  assert.equal(result.summary, result.assessment.summary);
  assert.ok(result.qualityMetadata.warnings.some((warning) => warning.includes("capped")));
});

test("rejects provider enum and score violations before normalization", () => {
  const invalid = rawReview();
  invalid.assessment.completeness = "unfinished";
  invalid.assessment.scores.language = 19;

  assert.throws(
    () => normalizeEssayReview("I ran, then I ran.", invalid),
    /AI returned an invalid Essay Review 2\.0 response/,
  );
});
