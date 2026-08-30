import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import {
  createPromptImageFilename,
  parsePromptImageId,
  resolvePromptImagePath,
} from "../lib/prompt-image-storage";
import {
  createFamilySessionToken,
  FAMILY_SESSION_COOKIE,
} from "../lib/family-session";
import { POST as uploadPromptImage } from "../app/api/essay/prompt-image/route";

test("prompt image identifiers reject traversal and ambiguous values", () => {
  assert.equal(parsePromptImageId(null), "temp");
  assert.equal(parsePromptImageId("temp"), "temp");
  assert.equal(parsePromptImageId("42"), "42");

  for (const value of ["../outside", "..", "1/../../x", "/1", "01", "0", "temp/child", ""]) {
    assert.equal(parsePromptImageId(value), null, value);
  }
});

test("prompt image paths only resolve strict names below the allowed root", () => {
  const root = path.resolve(process.cwd(), "public", "essay_prompts");
  const filename = createPromptImageFilename(1_777_777_777_777, "abcdef12-rest");
  const resolved = resolvePromptImagePath(root, "42", filename);

  assert.ok(resolved);
  assert.equal(resolved.directory, path.join(root, "42"));
  assert.equal(resolved.filePath, path.join(root, "42", filename));
  assert.equal(resolvePromptImagePath(root, "../outside", filename), null);
  assert.equal(resolvePromptImagePath(root, "42", "../../outside.jpg"), null);
  assert.equal(resolvePromptImagePath(root, "42", "image.jpg"), null);
});

test("prompt image upload rejects unauthenticated requests before parsing or writing", async () => {
  const response = await uploadPromptImage(
    new Request("http://localhost/api/essay/prompt-image", {
      method: "POST",
      body: "not multipart data",
    }) as never,
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { success: false, error: "Unauthorized" });
});

test("all sensitive Essay route handlers enforce the shared session guard", async () => {
  process.env.DATABASE_URL ??= "file:./memorydb";
  const [
    { POST: reviewEssay },
    { POST: importSpelling },
    { GET: getPhrases, POST: createPhrase, DELETE: deletePhrase },
  ] = await Promise.all([
    import("../app/api/essay/review/route"),
    import("../app/api/essay/import-spelling/route"),
    import("../app/api/essay/phrases/route"),
  ]);
  const handlers = [
    ["review POST", reviewEssay],
    ["spelling import POST", importSpelling],
    ["phrases GET", getPhrases],
    ["phrases POST", createPhrase],
    ["phrases DELETE", deletePhrase],
  ] as const;

  for (const [name, handler] of handlers) {
    const response = await handler(
      new Request("http://localhost/api/essay/test", { method: "POST" }) as never,
    );
    assert.equal(response.status, 401, name);
  }
});

test("prompt image upload rejects traversal before reading image bytes", async () => {
  const priorSecret = process.env.FAMILY_SESSION_SECRET;
  process.env.FAMILY_SESSION_SECRET = "test-only-route-secret";
  try {
    const token = await createFamilySessionToken("test-only-route-secret");
    const form = new FormData();
    form.set("promptId", "../../outside");
    form.set("file", new File(["not-an-image"], "prompt.jpg", { type: "image/jpeg" }));

    const response = await uploadPromptImage(
      new Request("http://localhost/api/essay/prompt-image", {
        method: "POST",
        headers: { cookie: `${FAMILY_SESSION_COOKIE}=${token}` },
        body: form,
      }) as never,
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid prompt identifier" });
  } finally {
    if (priorSecret === undefined) delete process.env.FAMILY_SESSION_SECRET;
    else process.env.FAMILY_SESSION_SECRET = priorSecret;
  }
});
