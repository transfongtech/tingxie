import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "../app/api/tts/route";
import {
  createTtsHandlers,
  TTS_GET_MAX_TEXT_LENGTH,
  TTS_POST_MAX_TEXT_LENGTH,
} from "../lib/tts-handler";

function stubbedHandlers() {
  const files = new Map<string, Buffer>();
  let providerCalls = 0;
  let fileSystemCalls = 0;

  const handlers = createTtsHandlers({
    authorize: async () => null,
    cacheDirectory: "tts-test-cache",
    provider: {
      async getAudioBase64() {
        providerCalls += 1;
        return Buffer.from("short audio").toString("base64");
      },
      async getAllAudioBase64() {
        providerCalls += 1;
        return [{ base64: Buffer.from("long audio").toString("base64") }];
      },
    },
    fileSystem: {
      existsSync(filePath) {
        fileSystemCalls += 1;
        return filePath === "tts-test-cache" || files.has(filePath);
      },
      mkdirSync() {
        fileSystemCalls += 1;
      },
      readFileSync(filePath) {
        fileSystemCalls += 1;
        const data = files.get(filePath);
        if (!data) throw new Error("Missing stubbed file");
        return data;
      },
      writeFileSync(filePath, data) {
        fileSystemCalls += 1;
        files.set(filePath, data);
      },
    },
  });

  return {
    handlers,
    effects: () => ({ providerCalls, fileSystemCalls }),
  };
}

test("TTS GET and POST reject unauthenticated requests", async () => {
  const getResponse = await GET(
    new Request("http://localhost/api/tts?text=hello&lang=en") as never,
  );
  const postResponse = await POST(
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "Teacher feedback", lang: "en" }),
    }) as never,
  );

  assert.equal(getResponse.status, 401);
  assert.equal(postResponse.status, 401);
  assert.deepEqual(await getResponse.json(), { success: false, error: "Unauthorized" });
  assert.deepEqual(await postResponse.json(), { success: false, error: "Unauthorized" });
});

test("TTS rejects oversized text before provider or filesystem work", async () => {
  const { handlers, effects } = stubbedHandlers();
  const getResponse = await handlers.GET(
    new Request(
      `http://localhost/api/tts?text=${"a".repeat(TTS_GET_MAX_TEXT_LENGTH + 1)}&lang=en`,
    ),
  );
  const postResponse = await handlers.POST(
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "a".repeat(TTS_POST_MAX_TEXT_LENGTH + 1), lang: "en" }),
    }),
  );

  assert.equal(getResponse.status, 413);
  assert.equal(postResponse.status, 413);
  assert.deepEqual(effects(), { providerCalls: 0, fileSystemCalls: 0 });
});

test("TTS rejects malformed bodies and invalid lang or slow values without effects", async () => {
  const { handlers, effects } = stubbedHandlers();
  const requests = [
    new Request("http://localhost/api/tts", { method: "POST", body: "not json" }),
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify(["not", "an", "object"]),
    }),
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "hello", lang: "fr" }),
    }),
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({ text: "hello", slow: "true" }),
    }),
  ];

  for (const request of requests) {
    assert.equal((await handlers.POST(request)).status, 400);
  }
  assert.equal(
    (
      await handlers.GET(
        new Request("http://localhost/api/tts?text=hello&lang=en&slow=1"),
      )
    ).status,
    400,
  );
  assert.deepEqual(effects(), { providerCalls: 0, fileSystemCalls: 0 });
});

test("TTS accepts exact GET and POST text boundaries with stubbed effects", async () => {
  const { handlers, effects } = stubbedHandlers();
  const getResponse = await handlers.GET(
    new Request(
      `http://localhost/api/tts?text=${"a".repeat(TTS_GET_MAX_TEXT_LENGTH)}&lang=en&slow=false`,
    ),
  );
  const postResponse = await handlers.POST(
    new Request("http://localhost/api/tts", {
      method: "POST",
      body: JSON.stringify({
        text: "b".repeat(TTS_POST_MAX_TEXT_LENGTH),
        lang: "zh",
        slow: true,
      }),
    }),
  );

  assert.equal(getResponse.status, 200);
  assert.equal(postResponse.status, 200);
  assert.equal(getResponse.headers.get("content-type"), "audio/mpeg");
  assert.equal(postResponse.headers.get("content-type"), "audio/mpeg");
  assert.deepEqual(effects(), { providerCalls: 2, fileSystemCalls: 8 });
});
