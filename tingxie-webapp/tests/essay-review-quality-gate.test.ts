import assert from "node:assert/strict";
import test from "node:test";

import {
  EssayReviewProviderError,
  EssayReviewQualityError,
  reviewEssayWithProvider,
  validateReviewQuality,
  type EssayReviewProviderRequest,
} from "../lib/essay-review";
import type { EssayReviewResultV2 } from "../lib/essay-review/schema";
import {
  resolveReviewInput,
  ReviewRequestError,
} from "../lib/essay-review/review-request";

const essayText = Array.from(
  { length: 90 },
  (_, index) => (index === 0 ? "I" : index === 1 ? "run" : `word${index}`),
).join(" ");

function validReview(): EssayReviewResultV2 {
  return {
    schemaVersion: 2,
    annotations: [{
      type: "grammar",
      startIndex: 2,
      endIndex: 5,
      original: "run",
      correction: "ran",
      explanation: "Use past tense.",
    }],
    studentFeedback: {
      strengths: ["The action follows a clear sequence."],
      nextSteps: ["Use past tense consistently."],
    },
    assessment: {
      scores: { content: 12, language: 10 },
      bands: { content: "C3", language: "L3" },
      completeness: "complete",
      evidence: {
        content: ["The final event resolves the main action."],
        language: ["Most actions are ordered clearly."],
      },
      contentBreakdown: {
        relevance: "The story addresses the topic.",
        development: "The story has a clear beginning, middle, and resolution.",
        plotCoherence: "Events follow a clear order.",
        engagement: "The action sustains interest.",
      },
      languageBreakdown: {
        grammar: "One tense error needs correction.",
        vocabulary: "Vocabulary is appropriate.",
        spelling: "Spelling is accurate.",
        organisation: "The sequence is clear.",
      },
      summary: "A clear story with a resolved ending.",
    },
    polishedVersion: {
      text: essayText.replace("run", "ran"),
      scores: { content: 13, language: 13 },
      changeSummary: ["Corrected the tense."],
      preservationJudgement: "preserved",
    },
    spellingErrors: [],
    goodPhrases: [{ phrase: "a clear sequence", category: "description" }],
    qualityMetadata: {
      engineVersion: "test",
      promptVersion: "test",
      model: "test",
      generatedAt: "2026-08-30T00:00:00.000Z",
      attempt: 1,
      warnings: [],
    },
  };
}

test("accepts a valid first response without retrying", async () => {
  const requests: EssayReviewProviderRequest[] = [];
  const result = await reviewEssayWithProvider(
    essayText,
    "A race",
    undefined,
    [],
    async (request) => {
      requests.push(request);
      return validReview();
    },
  );

  assert.equal(requests.length, 1);
  assert.equal(result.qualityMetadata.attempt, 1);
});

test("retries once with structured findings and recovers", async () => {
  const requests: EssayReviewProviderRequest[] = [];
  const invalid = validReview();
  invalid.assessment.bands.content = "C1";

  const result = await reviewEssayWithProvider(
    essayText,
    undefined,
    undefined,
    [],
    async (request) => {
      requests.push(request);
      return request.attempt === 1 ? invalid : validReview();
    },
  );

  assert.equal(requests.length, 2);
  assert.equal(requests[1].repairFindings[0].code, "SCORE_BAND_MISMATCH");
  assert.match(requests[1].prompt, /"code":"SCORE_BAND_MISMATCH"/);
  assert.equal(result.qualityMetadata.attempt, 2);
});

test("returns terminal quality failure after exactly two invalid attempts", async () => {
  let attempts = 0;
  const invalid = validReview();
  invalid.annotations[0].original = "missing";

  await assert.rejects(
    reviewEssayWithProvider(
      essayText,
      undefined,
      undefined,
      [],
      async () => {
        attempts += 1;
        return invalid;
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof EssayReviewQualityError);
      assert.equal(error.attempts, 2);
      assert.ok(error.findings.some(({ code }) => code === "ANNOTATION_UNRESOLVED"));
      return true;
    },
  );
  assert.equal(attempts, 2);
});

test("does not retry provider failures", async () => {
  let attempts = 0;
  await assert.rejects(
    reviewEssayWithProvider(
      essayText,
      undefined,
      undefined,
      [],
      async () => {
        attempts += 1;
        throw new EssayReviewProviderError(new Error("unavailable"));
      },
    ),
    EssayReviewProviderError,
  );
  assert.equal(attempts, 1);
});

test("reports completeness, annotation, and spelling consistency findings", () => {
  const invalid = validReview();
  invalid.assessment.completeness = "incomplete";
  invalid.assessment.scores.content = 12;
  invalid.spellingErrors = [{ wrong: "run", correct: "ran" }];

  const result = validateReviewQuality(essayText, invalid);
  assert.equal(result.valid, false);
  if (result.valid) return;
  const codes = new Set(result.findings.map(({ code }) => code));
  assert.ok(codes.has("COMPLETENESS_SCORE_CAP"));
  assert.ok(codes.has("SPELLING_ANNOTATION_MISSING"));
});

test("submission mode uses authoritative DB fields and rejects body mismatch", async () => {
  let loadedId: number | undefined;
  const load = async (id: number) => {
    loadedId = id;
    return {
      id,
      essayText: "Stored authoritative composition.",
      prompt: {
        title: "Stored prompt",
        description: "Stored instructions",
        images: [{ imagePath: "/prompts/one.png" }],
      },
    };
  };

  const input = await resolveReviewInput({ submissionId: 42 }, load);
  assert.equal(loadedId, 42);
  assert.equal(input.essayText, "Stored authoritative composition.");
  assert.equal(input.promptTitle, "Stored prompt");
  assert.deepEqual(input.imagePaths, ["/prompts/one.png"]);

  await assert.rejects(
    resolveReviewInput({ submissionId: 42, essayText: "Body composition." }, load),
    (error: unknown) =>
      error instanceof ReviewRequestError &&
      error.code === "SUBMISSION_MISMATCH" &&
      error.status === 409,
  );
});

test("preview mode is explicit and never loads a submission", async () => {
  let loaded = false;
  const input = await resolveReviewInput(
    { mode: "preview", essayText: "A preview composition." },
    async () => {
      loaded = true;
      return null;
    },
  );
  assert.equal(input.mode, "preview");
  assert.equal(loaded, false);
});
