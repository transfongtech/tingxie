import assert from "node:assert/strict";
import test from "node:test";

import { reviewAlreadyRunningResponse } from "../lib/review-regrade-response";

test("concurrent regrade returns a recoverable conflict response", async () => {
  const response = reviewAlreadyRunningResponse();
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), {
    success: false,
    code: "REVIEW_ALREADY_IN_PROGRESS",
    error: "A review is already running. Please wait for it to finish.",
  });
});
