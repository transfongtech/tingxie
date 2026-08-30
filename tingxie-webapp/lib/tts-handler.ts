import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { NextResponse } from "next/server";
import * as googleTTS from "google-tts-api";

import { requireFamilySession } from "@/lib/family-session";

export const TTS_GET_MAX_TEXT_LENGTH = 200;
export const TTS_POST_MAX_TEXT_LENGTH = 5_000;

type TtsLanguage = "en" | "zh";

interface AudioSegment {
  base64: string;
}

interface TtsProvider {
  getAudioBase64(
    text: string,
    options: { lang: string; slow: boolean; host: string },
  ): Promise<string>;
  getAllAudioBase64(
    text: string,
    options: { lang: string; slow: boolean; host: string },
  ): Promise<AudioSegment[]>;
}

interface TtsFileSystem {
  existsSync(filePath: string): boolean;
  mkdirSync(directoryPath: string, options: { recursive: true }): unknown;
  readFileSync(filePath: string): Buffer;
  writeFileSync(filePath: string, data: Buffer): unknown;
}

interface TtsHandlerDependencies {
  provider: TtsProvider;
  fileSystem: TtsFileSystem;
  cacheDirectory: string;
  authorize: (request: Request) => Promise<Response | null>;
}

interface TtsInput {
  text: string;
  language: TtsLanguage;
  slow: boolean;
}

const defaultDependencies: TtsHandlerDependencies = {
  provider: googleTTS,
  fileSystem: fs,
  cacheDirectory: path.join(process.cwd(), "public", "tts_cache"),
  authorize: requireFamilySession,
};

function errorResponse(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

function parseLanguage(value: unknown): TtsLanguage | null {
  return value === undefined || value === "zh"
    ? "zh"
    : value === "en"
      ? "en"
      : null;
}

function parseGetInput(request: Request): TtsInput | NextResponse {
  const searchParams = new URL(request.url).searchParams;
  const text = searchParams.get("text");
  const langValues = searchParams.getAll("lang");
  const slowValues = searchParams.getAll("slow");

  if (searchParams.getAll("text").length !== 1 || text === null || text.trim().length === 0) {
    return errorResponse("Missing or empty text", 400);
  }
  if (text.length > TTS_GET_MAX_TEXT_LENGTH) {
    return errorResponse("Text is too long", 413);
  }
  if (langValues.length > 1 || slowValues.length > 1) {
    return errorResponse("Invalid query parameters", 400);
  }

  const language = parseLanguage(langValues[0]);
  if (!language) return errorResponse("Invalid lang", 400);

  const slowValue = slowValues[0];
  if (slowValue !== undefined && slowValue !== "true" && slowValue !== "false") {
    return errorResponse("Invalid slow", 400);
  }

  return { text, language, slow: slowValue === "true" };
}

function parsePostInput(body: unknown): TtsInput | NextResponse {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return errorResponse("Invalid request body", 400);
  }

  const record = body as Record<string, unknown>;
  if (
    Object.keys(record).some((key) => !["text", "lang", "slow"].includes(key)) ||
    typeof record.text !== "string" ||
    record.text.trim().length === 0
  ) {
    return errorResponse("Invalid request body", 400);
  }
  if (record.text.length > TTS_POST_MAX_TEXT_LENGTH) {
    return errorResponse("Text is too long", 413);
  }

  const language = parseLanguage(record.lang);
  if (!language) return errorResponse("Invalid lang", 400);
  if (record.slow !== undefined && typeof record.slow !== "boolean") {
    return errorResponse("Invalid slow", 400);
  }

  return {
    text: record.text,
    language,
    slow: record.slow ?? false,
  };
}

function audioOptions(input: TtsInput) {
  return {
    lang: input.language === "en" ? "en" : "zh-CN",
    slow: input.slow,
    host: "https://translate.google.com",
  };
}

function cachePath(input: TtsInput, dependencies: TtsHandlerDependencies): string {
  const options = audioOptions(input);
  const hash = crypto
    .createHash("md5")
    .update(input.text + options.lang + (input.slow ? "_slow" : ""))
    .digest("hex");
  return path.join(dependencies.cacheDirectory, `${hash}.mp3`);
}

function ensureCacheDirectory(dependencies: TtsHandlerDependencies): void {
  if (!dependencies.fileSystem.existsSync(dependencies.cacheDirectory)) {
    dependencies.fileSystem.mkdirSync(dependencies.cacheDirectory, { recursive: true });
  }
}

function audioResponse(fileBuffer: Buffer, maxAge: number): NextResponse {
  return new NextResponse(new Uint8Array(fileBuffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": `public, max-age=${maxAge}${maxAge > 86400 ? ", immutable" : ""}`,
    },
  });
}

export function createTtsHandlers(
  overrides: Partial<TtsHandlerDependencies> = {},
): {
  GET(request: Request): Promise<Response>;
  POST(request: Request): Promise<Response>;
} {
  const dependencies = { ...defaultDependencies, ...overrides };

  return {
    async GET(request: Request): Promise<Response> {
      const unauthorized = await dependencies.authorize(request);
      if (unauthorized) return unauthorized;

      const input = parseGetInput(request);
      if (input instanceof NextResponse) return input;

      try {
        const filePath = cachePath(input, dependencies);
        ensureCacheDirectory(dependencies);
        if (!dependencies.fileSystem.existsSync(filePath)) {
          const base64Audio = await dependencies.provider.getAudioBase64(
            input.text,
            audioOptions(input),
          );
          dependencies.fileSystem.writeFileSync(filePath, Buffer.from(base64Audio, "base64"));
        }
        return audioResponse(dependencies.fileSystem.readFileSync(filePath), 31_536_000);
      } catch (error: unknown) {
        console.error("TTS generation failed", error);
        return errorResponse("TTS generation failed", 500);
      }
    },

    async POST(request: Request): Promise<Response> {
      const unauthorized = await dependencies.authorize(request);
      if (unauthorized) return unauthorized;

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return errorResponse("Invalid request body", 400);
      }

      const input = parsePostInput(body);
      if (input instanceof NextResponse) return input;

      try {
        const filePath = cachePath(input, dependencies);
        ensureCacheDirectory(dependencies);
        if (!dependencies.fileSystem.existsSync(filePath)) {
          const segments = await dependencies.provider.getAllAudioBase64(
            input.text,
            audioOptions(input),
          );
          const combined = Buffer.concat(
            segments.map((segment) => Buffer.from(segment.base64, "base64")),
          );
          dependencies.fileSystem.writeFileSync(filePath, combined);
        }
        return audioResponse(dependencies.fileSystem.readFileSync(filePath), 86_400);
      } catch (error: unknown) {
        console.error("Long TTS generation failed", error);
        return errorResponse("TTS generation failed", 500);
      }
    },
  };
}
