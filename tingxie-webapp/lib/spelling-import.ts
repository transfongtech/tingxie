export const MAX_SPELLING_IMPORT_ITEMS = 100;

export interface SpellingErrorInput {
  wrong: string;
  correct: string;
}

export type SpellingImportItemStatus =
  | "imported"
  | "duplicate"
  | "rejected"
  | "failed";

export interface SpellingImportItemResult extends SpellingErrorInput {
  status: SpellingImportItemStatus;
  message?: string;
}

export interface SpellingImportResult {
  success: boolean;
  outcome: "success" | "partial" | "failure";
  imported: number;
  duplicates: number;
  rejected: number;
  failed: number;
  items: SpellingImportItemResult[];
  error?: string;
}

export type SpellingImportRequestParseResult =
  | { ok: true; spellingErrors: unknown[] }
  | { ok: false; error: string };

export function normalizeForDedupe(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

export function parseSpellingImportRequest(
  value: unknown,
): SpellingImportRequestParseResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Request body must be a JSON object" };
  }
  const spellingErrors = (value as Record<string, unknown>).spellingErrors;
  if (!Array.isArray(spellingErrors)) {
    return { ok: false, error: "spellingErrors must be an array" };
  }
  if (spellingErrors.length > MAX_SPELLING_IMPORT_ITEMS) {
    return {
      ok: false,
      error: `spellingErrors cannot contain more than ${MAX_SPELLING_IMPORT_ITEMS} items`,
    };
  }
  return { ok: true, spellingErrors };
}

function cleanSpellingItem(value: unknown):
  | { ok: true; value: SpellingErrorInput }
  | { ok: false; value: SpellingErrorInput; error: string } {
  const fallback = { wrong: "", correct: "" };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, value: fallback, error: "Item must be an object" };
  }
  const { wrong, correct } = value as Record<string, unknown>;
  if (typeof wrong !== "string" || typeof correct !== "string") {
    return {
      ok: false,
      value: {
        wrong: typeof wrong === "string" ? wrong : "",
        correct: typeof correct === "string" ? correct : "",
      },
      error: "wrong and correct must be strings",
    };
  }

  const cleaned = {
    wrong: wrong.normalize("NFKC").trim(),
    correct: correct.normalize("NFKC").trim(),
  };
  if (!cleaned.wrong || cleaned.wrong.length > 80) {
    return {
      ok: false,
      value: cleaned,
      error: "wrong must contain between 1 and 80 characters",
    };
  }
  if (
    cleaned.correct.length > 64 ||
    !/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(cleaned.correct)
  ) {
    return {
      ok: false,
      value: cleaned,
      error: "correct must be a single English word (hyphens and apostrophes are allowed)",
    };
  }
  return { ok: true, value: cleaned };
}

interface SpellingTransaction {
  word: {
    create(args: { data: { content: string } }): Promise<{ id: number; content: string }>;
  };
  learningProgress: {
    upsert(args: unknown): Promise<unknown>;
  };
  wordList: {
    create(args: { data: { weekId: number; wordId: number } }): Promise<unknown>;
  };
}

export interface SpellingImportDatabase {
  week: {
    upsert(args: unknown): Promise<{ id: number }>;
  };
  word: {
    findMany(args: {
      select: { id: true; content: true };
    }): Promise<Array<{ id: number; content: string }>>;
  };
  wordList: {
    findMany(args: {
      where: { weekId: number };
      select: { wordId: true };
    }): Promise<Array<{ wordId: number }>>;
  };
  $transaction<T>(operation: (tx: SpellingTransaction) => Promise<T>): Promise<T>;
}

function outcomeFor(counts: {
  imported: number;
  duplicates: number;
  rejected: number;
  failed: number;
}): SpellingImportResult["outcome"] {
  if (counts.failed === 0 && counts.rejected === 0) return "success";
  if (counts.imported > 0 || counts.duplicates > 0) return "partial";
  return "failure";
}

export async function persistSpellingErrors(
  rawItems: readonly unknown[],
  db: SpellingImportDatabase,
  now = new Date(),
): Promise<SpellingImportResult> {
  const items: SpellingImportItemResult[] = [];
  const valid: Array<SpellingErrorInput & { key: string }> = [];
  const requestKeys = new Set<string>();

  for (const rawItem of rawItems) {
    const parsed = cleanSpellingItem(rawItem);
    if (!parsed.ok) {
      items.push({ ...parsed.value, status: "rejected", message: parsed.error });
      continue;
    }
    const key = normalizeForDedupe(parsed.value.correct);
    if (requestKeys.has(key)) {
      items.push({ ...parsed.value, status: "duplicate", message: "Duplicate in request" });
      continue;
    }
    requestKeys.add(key);
    valid.push({ ...parsed.value, key });
  }

  if (valid.length === 0) {
    const rejected = items.filter((item) => item.status === "rejected").length;
    const duplicates = items.filter((item) => item.status === "duplicate").length;
    const outcome = outcomeFor({ imported: 0, duplicates, rejected, failed: 0 });
    return {
      success: outcome === "success",
      outcome,
      imported: 0,
      duplicates,
      rejected,
      failed: 0,
      items,
    };
  }

  let week: { id: number };
  let existingWords: Array<{ id: number; content: string }>;
  let linkedWordIds: Set<number>;
  try {
    const grade = Math.max(1, Math.min(4 + (now.getFullYear() - 2026), 6));
    week = await db.week.upsert({
      where: {
        number_language_grade_term: { number: 0, language: "en", grade, term: 0 },
      },
      update: {},
      create: {
        number: 0,
        language: "en",
        grade,
        term: 0,
        title: "Composition Spelling Bank (作文积累词库)",
        isActive: true,
      },
    });
    existingWords = await db.word.findMany({ select: { id: true, content: true } });
    linkedWordIds = new Set(
      (
        await db.wordList.findMany({
          where: { weekId: week.id },
          select: { wordId: true },
        })
      ).map(({ wordId }) => wordId),
    );
  } catch (error) {
    console.error("Failed to initialize spelling import:", error);
    for (const item of valid) {
      items.push({
        wrong: item.wrong,
        correct: item.correct,
        status: "failed",
        message: "Database operation failed",
      });
    }
    return {
      success: false,
      outcome: "failure",
      imported: 0,
      duplicates: items.filter((item) => item.status === "duplicate").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      failed: valid.length,
      items,
      error: "Failed to prepare the spelling bank",
    };
  }

  const wordsByKey = new Map(
    existingWords.map((word) => [normalizeForDedupe(word.content), word]),
  );
  for (const item of valid) {
    const existing = wordsByKey.get(item.key);
    if (existing && linkedWordIds.has(existing.id)) {
      items.push({ wrong: item.wrong, correct: item.correct, status: "duplicate" });
      continue;
    }
    try {
      const word = await db.$transaction(async (tx) => {
        const target =
          existing ??
          (await tx.word.create({
            data: { content: item.correct },
          }));
        await tx.learningProgress.upsert({
          where: { wordId: target.id },
          update: {},
          create: {
            wordId: target.id,
            stage: 0,
            nextReviewDate: now,
            isMastered: false,
          },
        });
        await tx.wordList.create({
          data: { weekId: week.id, wordId: target.id },
        });
        return target;
      });
      wordsByKey.set(item.key, word);
      linkedWordIds.add(word.id);
      items.push({ wrong: item.wrong, correct: item.correct, status: "imported" });
    } catch (error) {
      console.error(`Failed to import spelling word "${item.correct}":`, error);
      items.push({
        wrong: item.wrong,
        correct: item.correct,
        status: "failed",
        message: "Database operation failed",
      });
    }
  }

  const imported = items.filter((item) => item.status === "imported").length;
  const duplicates = items.filter((item) => item.status === "duplicate").length;
  const rejected = items.filter((item) => item.status === "rejected").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const outcome = outcomeFor({ imported, duplicates, rejected, failed });
  return {
    success: outcome === "success",
    outcome,
    imported,
    duplicates,
    rejected,
    failed,
    items,
    error: failed > 0 ? "Some words could not be imported" : undefined,
  };
}
