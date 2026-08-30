import assert from "node:assert/strict";
import {
  ESSAY_REVIEW_SCHEMA_VERSION,
  isEssayReviewResult,
  parseEssayReviewResult,
} from "../lib/essay-review/schema";

function validReview(): unknown {
  return {
    schemaVersion: ESSAY_REVIEW_SCHEMA_VERSION,
    annotations: [{
      type: "grammar",
      startIndex: 4,
      endIndex: 7,
      original: "run",
      correction: "ran",
      explanation: "Use the past tense here.",
    }],
    studentFeedback: {
      strengths: ["Your opening creates interest."],
      nextSteps: ["Keep the story in the past tense.", "Add a clearer ending."],
    },
    assessment: {
      scores: { content: 12, language: 10 },
      bands: { content: "C3", language: "L3" },
      completeness: "complete",
      evidence: {
        content: ["The lost child is reunited with her parent at the gate."],
        language: ["The draft uses a clear sequence of past-tense actions."],
      },
      contentBreakdown: {
        relevance: "The story addresses the topic.",
        development: "The beginning and middle are developed.",
        plotCoherence: "Events follow a clear order.",
        engagement: "The opening draws the reader in.",
      },
      languageBreakdown: {
        grammar: "Past tense sometimes changes.",
        vocabulary: "Vocabulary is appropriate.",
        spelling: "Most words are accurate.",
        organisation: "Paragraphing is clear.",
      },
      summary: "A relevant and enjoyable story with a clear sequence.",
    },
    polishedVersion: {
      text: "I ran towards the gate.",
      scores: { content: 14, language: 15 },
      changeSummary: ["Corrected tense and clarified the ending."],
      preservationJudgement: "minor_changes",
    },
    spellingErrors: [{ wrong: "freind", correct: "friend" }],
    goodPhrases: [{ phrase: "my heart hammered", category: "fear" }],
    qualityMetadata: {
      engineVersion: "review-core-2.0.0",
      promptVersion: "essay-review-2",
      model: "gemini-test",
      generatedAt: "2026-08-30T03:51:51.488Z",
      attempt: 1,
      warnings: [],
    },
  };
}

const accepted = parseEssayReviewResult(validReview());
assert.equal(accepted.ok, true);
assert.equal(isEssayReviewResult(validReview()), true);
if (!accepted.ok) throw new Error("Valid fixture was rejected");

const invalid = {
  ...accepted.value,
  annotations: [{ type: "style" }],
  studentFeedback: { strengths: [], nextSteps: ["one", "two", "three", "four"] },
  assessment: {
    ...accepted.value.assessment,
    scores: { content: 18.5, language: 19 },
    bands: { content: "C0", language: "L2" },
    completeness: "unfinished",
  },
  polishedVersion: {
    text: "A polished essay.",
    scores: { content: -1, language: 18.2 },
    changeSummary: [],
    preservationJudgement: "rewritten",
  },
  qualityMetadata: {
    engineVersion: "",
    promptVersion: "essay-review-2",
    model: "gemini-test",
    generatedAt: "2026-08-30T03:51:51.488Z",
    attempt: 0,
    warnings: [],
  },
};

const rejected = parseEssayReviewResult(invalid);
assert.equal(rejected.ok, false);
if (!rejected.ok) {
  const paths = new Set(rejected.errors.map((error) => error.path));
  assert.ok(paths.has("$.annotations[0].type"));
  assert.ok(paths.has("$.annotations[0].startIndex"));
  assert.ok(paths.has("$.studentFeedback.strengths"));
  assert.ok(paths.has("$.studentFeedback.nextSteps"));
  assert.ok(paths.has("$.assessment.scores.content"));
  assert.ok(paths.has("$.assessment.scores.language"));
  assert.ok(paths.has("$.assessment.bands.content"));
  assert.ok(paths.has("$.assessment.completeness"));
  assert.ok(paths.has("$.polishedVersion.scores.content"));
  assert.ok(paths.has("$.polishedVersion.scores.language"));
  assert.ok(paths.has("$.polishedVersion.changeSummary"));
  assert.ok(paths.has("$.polishedVersion.preservationJudgement"));
  assert.ok(paths.has("$.qualityMetadata.engineVersion"));
  assert.ok(paths.has("$.qualityMetadata.attempt"));
}

assert.equal(isEssayReviewResult(null), false);
assert.equal(isEssayReviewResult({ schemaVersion: 1 }), false);
console.log("Essay Review 2.0 runtime schema harness passed.");
