import assert from "node:assert/strict";
import test from "node:test";

import { reviewEssayWithAI } from "../lib/essay-review";
import { getGeminiClient } from "../lib/gemini";

async function withoutGeminiKey<T>(callback: () => T | Promise<T>): Promise<T> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  try {
    return await callback();
  } finally {
    if (geminiKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = geminiKey;
    if (googleKey === undefined) delete process.env.GOOGLE_API_KEY;
    else process.env.GOOGLE_API_KEY = googleKey;
  }
}

test("Gemini module imports without a key and client creation fails explicitly", async () => {
  await withoutGeminiKey(() => {
    assert.throws(
      () => getGeminiClient(),
      /Set GEMINI_API_KEY or GOOGLE_API_KEY/,
    );
  });
});

test("essay review reports a provider failure when called without a key", async () => {
  await withoutGeminiKey(async () => {
    await assert.rejects(
      reviewEssayWithAI("A complete essay."),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "EssayReviewProviderError" &&
        error.cause instanceof Error &&
        error.cause.message === "API key is not configured.",
    );
  });
});
