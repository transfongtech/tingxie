import assert from "node:assert/strict";
import test from "node:test";

import {
  createFamilySessionToken,
  FAMILY_SESSION_COOKIE,
  requireFamilySession,
  verifyFamilySessionToken,
} from "../lib/family-session";

const SECRET = "test-only-family-secret";
const NOW = Date.UTC(2026, 7, 30);

test("family session tokens are server-verifiable and expire", async () => {
  const token = await createFamilySessionToken(SECRET, NOW);

  assert.equal(await verifyFamilySessionToken(token, SECRET, NOW), true);
  assert.equal(await verifyFamilySessionToken(`${token}x`, SECRET, NOW), false);
  assert.equal(await verifyFamilySessionToken(token, "different-secret", NOW), false);
  assert.equal(
    await verifyFamilySessionToken(token, SECRET, NOW + 31 * 24 * 60 * 60 * 1000),
    false,
  );
  assert.equal(await verifyFamilySessionToken("authenticated", SECRET, NOW), false);
});

test("family session guard returns 401 without a verifiable cookie", async () => {
  const missing = await requireFamilySession(new Request("http://localhost/api/essay/review"));
  assert.equal(missing?.status, 401);
  assert.deepEqual(await missing?.json(), { success: false, error: "Unauthorized" });

  const forged = await requireFamilySession(
    new Request("http://localhost/api/essay/review", {
      headers: { cookie: `${FAMILY_SESSION_COOKIE}=authenticated` },
    }),
  );
  assert.equal(forged?.status, 401);

  const malformed = await requireFamilySession(
    new Request("http://localhost/api/essay/review", {
      headers: { cookie: `${FAMILY_SESSION_COOKIE}=%ZZ` },
    }),
  );
  assert.equal(malformed?.status, 401);
});
