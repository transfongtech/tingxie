import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSpellingImportRequest,
  persistSpellingErrors,
  type SpellingImportDatabase,
} from "../lib/spelling-import";
import {
  persistPhrases,
  validatePhrase,
  type PhraseDatabase,
  type StoredPhrase,
} from "../lib/phrase-persistence";

function spellingDb(options: { failWord?: string } = {}) {
  const words: Array<{ id: number; content: string }> = [
    { id: 1, content: "Already" },
  ];
  const links = new Set<number>([1]);
  const db = {
    week: { upsert: async () => ({ id: 9 }) },
    word: {
      findMany: async () => words.map((word) => ({ ...word })),
    },
    wordList: {
      findMany: async () => [...links].map((wordId) => ({ wordId })),
    },
    $transaction: async (
      operation: (tx: {
        word: { create: (args: { data: { content: string } }) => Promise<{ id: number; content: string }> };
        learningProgress: { upsert: () => Promise<void> };
        wordList: { create: (args: { data: { wordId: number } }) => Promise<void> };
      }) => Promise<unknown>,
    ) =>
      operation({
        word: {
          create: async ({ data }) => {
            if (data.content === options.failWord) throw new Error("write failed");
            const word = { id: words.length + 1, content: data.content };
            words.push(word);
            return word;
          },
        },
        learningProgress: { upsert: async () => undefined },
        wordList: {
          create: async ({ data }) => {
            links.add(data.wordId);
          },
        },
      }),
  } as unknown as SpellingImportDatabase;
  return { db, words, links };
}

test("spelling request parser rejects malformed and oversized payloads", () => {
  assert.equal(parseSpellingImportRequest(null).ok, false);
  assert.equal(parseSpellingImportRequest({ spellingErrors: "word" }).ok, false);
  assert.equal(
    parseSpellingImportRequest({ spellingErrors: Array.from({ length: 101 }) }).ok,
    false,
  );
  assert.equal(parseSpellingImportRequest({ spellingErrors: [] }).ok, true);
});

test("spelling import deduplicates normalized text and preserves first display casing", async () => {
  const state = spellingDb();
  const result = await persistSpellingErrors(
    [
      { wrong: "recieve", correct: "Receive" },
      { wrong: "receve", correct: " receive " },
      { wrong: "alredy", correct: "already" },
    ],
    state.db,
    new Date("2026-01-01"),
  );

  assert.equal(result.outcome, "success");
  assert.equal(result.imported, 1);
  assert.equal(result.duplicates, 2);
  assert.equal(state.words.at(-1)?.content, "Receive");

  const repeated = await persistSpellingErrors(
    [{ wrong: "receve", correct: "RECEIVE" }],
    state.db,
  );
  assert.equal(repeated.imported, 0);
  assert.equal(repeated.duplicates, 1);
});

test("spelling import rejects invalid items and reports partial database failures", async () => {
  const state = spellingDb({ failWord: "Broken" });
  const result = await persistSpellingErrors(
    [
      { wrong: "frend", correct: "Friend" },
      { wrong: "two words", correct: "not valid" },
      { wrong: "brokn", correct: "Broken" },
    ],
    state.db,
  );

  assert.equal(result.success, false);
  assert.equal(result.outcome, "partial");
  assert.deepEqual(
    {
      imported: result.imported,
      rejected: result.rejected,
      failed: result.failed,
    },
    { imported: 1, rejected: 1, failed: 1 },
  );
  assert.deepEqual(
    result.items.map((item) => item.status),
    ["rejected", "imported", "failed"],
  );
});

function phraseDb(initial: StoredPhrase[] = []) {
  const phrases = [...initial];
  const db = {
    $transaction: async (
      operation: (tx: {
        phrase: {
          findMany: () => Promise<StoredPhrase[]>;
          create: (args: { data: Omit<StoredPhrase, "id"> }) => Promise<StoredPhrase>;
          update: (args: { where: { id: number }; data: { category: string } }) => Promise<StoredPhrase>;
        };
      }) => Promise<unknown>,
    ) =>
      operation({
        phrase: {
          findMany: async () => [...phrases],
          create: async ({ data }) => {
            const row = { id: phrases.length + 1, ...data };
            phrases.push(row);
            return row;
          },
          update: async ({ where, data }) => {
            const row = phrases.find((phrase) => phrase.id === where.id)!;
            row.category = data.category;
            return row;
          },
        },
      }),
  } as unknown as PhraseDatabase;
  return { db, phrases };
}

test("phrase validation enforces category and useful text", () => {
  assert.equal(validatePhrase({ phrase: "", category: "fear" }).ok, false);
  assert.equal(validatePhrase({ phrase: "Great", category: "fear" }).ok, false);
  assert.equal(
    validatePhrase({ phrase: "Heart pounded wildly", category: "made-up" }).ok,
    false,
  );
  assert.deepEqual(
    validatePhrase({ phrase: "  Heart   Pounded Wildly  ", category: "fear" }),
    {
      ok: true,
      value: { phrase: "Heart Pounded Wildly", category: "fear" },
    },
  );
});

test("phrase persistence deduplicates case-insensitively without lowercasing display text", async () => {
  const state = phraseDb();
  const first = await persistPhrases(
    [
      { phrase: "My Heart Hammered", category: "fear" },
      { phrase: "my heart hammered", category: "fear" },
    ],
    "ai",
    state.db,
  );
  assert.equal(first.outcome, "success");
  assert.equal(first.duplicates, 1);
  assert.equal(state.phrases[0].content, "My Heart Hammered");

  const repeated = await persistPhrases(
    [{ phrase: "MY HEART HAMMERED", category: "fear" }],
    "ai",
    state.db,
  );
  assert.equal(repeated.duplicates, 1);
  assert.equal(state.phrases.length, 1);
  assert.equal(state.phrases[0].content, "My Heart Hammered");
});
