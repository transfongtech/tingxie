import assert from "node:assert/strict";
import test from "node:test";

import {
  type AnnotationToResolve,
  resolveAnnotations,
} from "./annotation-resolver";

const annotation = (
  original: string,
  extra: Partial<AnnotationToResolve> = {},
): AnnotationToResolve => ({
  type: "grammar",
  original,
  correction: "fixed",
  explanation: "Fix this.",
  ...extra,
});

test("accepts exact safe offsets and replaces mismatched offsets", () => {
  const result = resolveAnnotations("one two", [
    annotation("two", { startIndex: 4, endIndex: 7 }),
    annotation("one", { startIndex: 99, endIndex: 102 }),
  ]);

  assert.deepEqual(
    result.resolved.map(({ startIndex, endIndex }) => [startIndex, endIndex]),
    [
      [4, 7],
      [0, 3],
    ],
  );
  assert.equal(result.unresolved.length, 0);
});

test("resolves repeated text in annotation order without reusing a range", () => {
  const result = resolveAnnotations("bad, bad, bad", [
    annotation("bad"),
    annotation("bad"),
    annotation("bad"),
  ]);

  assert.deepEqual(
    result.resolved.map(({ startIndex }) => startIndex),
    [0, 5, 10],
  );
});

test("uses occurrence and immediate context anchors", () => {
  const result = resolveAnnotations("red cat; blue cat; red cat", [
    annotation("cat", { occurrence: 2 }),
    annotation("cat", { context: { before: "red ", after: "" } }),
  ]);

  assert.deepEqual(
    result.resolved.map(({ startIndex }) => startIndex),
    [14, 23],
  );
});

test("moves to the next occurrence when the intended range overlaps", () => {
  const result = resolveAnnotations("aaaa", [
    annotation("aa", { occurrence: 1 }),
    annotation("aa", { occurrence: 1 }),
  ]);

  assert.deepEqual(
    result.resolved.map(({ startIndex, endIndex }) => [startIndex, endIndex]),
    [
      [0, 2],
      [2, 4],
    ],
  );
});

test("returns unresolvable and overlapping annotations separately", () => {
  const missing = annotation("missing", { startIndex: 0, endIndex: 7 });
  const conflicting = annotation("abc");
  const result = resolveAnnotations("abc", [annotation("abc"), conflicting, missing]);

  assert.equal(result.resolved.length, 1);
  assert.deepEqual(result.unresolved, [
    { annotation: conflicting, reason: "overlap" },
    { annotation: missing, reason: "not-found" },
  ]);
});

test("does not fall back to a different occurrence when an anchor is false", () => {
  const anchored = annotation("word", {
    occurrence: 2,
    context: { before: "wrong " },
  });
  const result = resolveAnnotations("first word, second word", [anchored]);

  assert.deepEqual(result.resolved, []);
  assert.deepEqual(result.unresolved, [
    { annotation: anchored, reason: "context-not-found" },
  ]);
});
