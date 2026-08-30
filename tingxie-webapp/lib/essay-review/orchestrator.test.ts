import assert from "node:assert/strict";
import test from "node:test";

import { reviewEssay } from "./orchestrator";
import type { EssayReviewResultV2 } from "./schema";

const text = `${"word ".repeat(88)}run home`;

function validReview(): EssayReviewResultV2 {
  const startIndex = text.indexOf("run");
  return {
    schemaVersion: 2,
    annotations: [{
      type: "grammar",
      startIndex,
      endIndex: startIndex + 3,
      original: "run",
      correction: "ran",
      explanation: "Use past tense.",
    }],
    studentFeedback: {
      strengths: ["The sequence is clear."],
      nextSteps: ["Keep verbs in the past tense."],
    },
    assessment: {
      scores: { content: 12, language: 10 },
      bands: { content: "C3", language: "L3" },
      completeness: "complete",
      evidence: { content: ["The action resolves."], language: ["The sequence is clear."] },
      contentBreakdown: {
        relevance: "Relevant.",
        development: "Complete.",
        plotCoherence: "Clear.",
        engagement: "Interesting.",
      },
      languageBreakdown: {
        grammar: "Mostly controlled.",
        vocabulary: "Appropriate.",
        spelling: "Accurate.",
        organisation: "Clear.",
      },
      summary: "A clear, complete response.",
    },
    polishedVersion: {
      text: text.replace("run", "ran"),
      scores: { content: 13, language: 13 },
      changeSummary: ["Corrected tense."],
      preservationJudgement: "preserved",
    },
    spellingErrors: [],
    goodPhrases: [{ phrase: "ran home", category: "urgency" }],
    qualityMetadata: {
      engineVersion: "ignored",
      promptVersion: "ignored",
      model: "ignored",
      generatedAt: "2026-01-01T00:00:00.000Z",
      attempt: 1,
      warnings: [],
    },
  };
}

test("runs with a provider-neutral input and reports provider metadata", async () => {
  const seen: unknown[] = [];
  const outcome = await reviewEssay(
    {
      text,
      prompt: { title: "A journey" },
      images: [{ data: new Uint8Array([1, 2, 3]), mimeType: "image/png" }],
    },
    {
      id: "compobuddy-provider",
      model: "custom-model",
      async generate(request) {
        seen.push(request);
        return validReview();
      },
    },
    { gradeLevel: "P5", now: () => new Date("2026-08-30T00:00:00.000Z") },
  );

  assert.equal(outcome.provider, "compobuddy-provider");
  assert.equal(outcome.model, "custom-model");
  assert.equal(outcome.review.qualityMetadata.model, "custom-model");
  assert.equal(outcome.review.qualityMetadata.generatedAt, "2026-08-30T00:00:00.000Z");
  assert.equal(seen.length, 1);
  assert.doesNotMatch((seen[0] as { prompt: string }).prompt, /George/);
});
