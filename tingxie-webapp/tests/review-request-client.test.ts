import assert from "node:assert/strict";
import test from "node:test";

import {
  requestPersistedEssayReview,
  ReviewRequestFailure,
} from "../components/essay/review-request-client";

test("accepts only an HTTP and body success from the persisted review endpoint", async () => {
  let request: RequestInit | undefined;
  await requestPersistedEssayReview(17, async (_input, init) => {
    request = init;
    return new Response(JSON.stringify({ success: true, data: { schemaVersion: 2 } }), {
      status: 200,
    });
  });

  assert.equal(request?.credentials, "same-origin");
  assert.deepEqual(JSON.parse(String(request?.body)), { submissionId: 17 });
});

test("rejects a nominal 200 response without persisted review success", async () => {
  await assert.rejects(
    requestPersistedEssayReview(
      17,
      async () => new Response(JSON.stringify({ success: false }), { status: 200 }),
    ),
    ReviewRequestFailure,
  );
});

test("reports expired family authentication distinctly", async () => {
  await assert.rejects(
    requestPersistedEssayReview(
      17,
      async () =>
        new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
          status: 401,
        }),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ReviewRequestFailure);
      assert.equal(error.status, 401);
      assert.match(error.message, /family session has expired/i);
      return true;
    },
  );
});

test("explains persistence failures without claiming an old review changed", async () => {
  await assert.rejects(
    requestPersistedEssayReview(
      17,
      async () =>
        new Response(
          JSON.stringify({ success: false, code: "REVIEW_STORAGE_FAILED" }),
          { status: 500 },
        ),
    ),
    (error: unknown) => {
      assert.ok(error instanceof ReviewRequestFailure);
      assert.match(error.message, /No previous review was replaced/i);
      return true;
    },
  );
});
