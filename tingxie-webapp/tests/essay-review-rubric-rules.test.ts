import assert from "node:assert/strict";
import test from "node:test";

import {
  applyContentScoreCap,
  bandForScore,
  calculateTotalScore,
  configureEssayRubric,
  countEssayWords,
  DEFAULT_ESSAY_RUBRIC,
  validateEssayScores,
} from "../lib/essay-review/rubric-rules";

test("publishes configurable PSLE-aligned metadata and complete score bands", () => {
  assert.equal(DEFAULT_ESSAY_RUBRIC.maximumScore.total, 36);
  assert.deepEqual(DEFAULT_ESSAY_RUBRIC.contentBands.map(({ id }) => id), ["C1", "C2", "C3", "C4", "C5", "C6"]);
  assert.deepEqual(DEFAULT_ESSAY_RUBRIC.languageBands.map(({ id }) => id), ["L1", "L2", "L3", "L4", "L5", "L6"]);
  assert.equal(bandForScore(18, DEFAULT_ESSAY_RUBRIC.contentBands), "C1");
  assert.equal(bandForScore(0, DEFAULT_ESSAY_RUBRIC.languageBands), "L6");

  const configured = configureEssayRubric({ version: "school-2026", displayName: "School rubric" });
  assert.equal(configured.version, "school-2026");
  assert.equal(configured.displayName, "School rubric");
});

test("counts words deterministically and calculates totals on the server", () => {
  assert.equal(countEssayWords("  George's well-written story... ended!  "), 4);
  assert.equal(countEssayWords(""), 0);
  assert.equal(calculateTotalScore(13, 14), 27);
});

test("caps content for under-80-word and incomplete stories", () => {
  assert.equal(applyContentScoreCap(17, 79, "complete"), 9);
  assert.equal(applyContentScoreCap(17, 120, "incomplete"), 9);
  assert.equal(applyContentScoreCap(17, 80, "complete"), 17);

  const configured = configureEssayRubric({ incompleteStoryContentCap: 8 });
  assert.equal(applyContentScoreCap(17, 120, "incomplete", configured), 8);
});

test("validates score bands, completeness caps, word caps, and supplied totals", () => {
  const valid = validateEssayScores({
    content: 15,
    language: 13,
    contentBand: "C2",
    languageBand: "L2",
    completeness: "complete",
    wordCount: 120,
  });
  assert.deepEqual(valid, { valid: true, errors: [], calculatedTotal: 28 });

  const invalid = validateEssayScores({
    content: 16,
    language: 12,
    contentBand: "C2",
    languageBand: "L2",
    completeness: "incomplete",
    wordCount: 79,
    total: 99,
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.calculatedTotal, 28);
  assert.ok(invalid.errors.some((error) => error.includes("belongs to C1")));
  assert.ok(invalid.errors.some((error) => error.includes("belongs to L3")));
  assert.ok(invalid.errors.some((error) => error.includes("cap of 9")));
  assert.ok(invalid.errors.some((error) => error.includes("server-calculated score of 28")));

  const invalidCompleteness = validateEssayScores({
    content: 9,
    language: 9,
    contentBand: "C4",
    languageBand: "L4",
    completeness: "unfinished" as never,
    wordCount: 100,
  });
  assert.ok(invalidCompleteness.errors.some((error) => error.includes("Completeness must")));
});
