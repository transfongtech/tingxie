import { normalizeForDedupe } from "@/lib/spelling-import";

export const PHRASE_CATEGORIES = [
  "fear",
  "happiness",
  "sadness",
  "anger",
  "urgency",
  "surprise",
  "weather",
  "description",
] as const;

export type PhraseCategory = (typeof PHRASE_CATEGORIES)[number];
export type PhraseSource = "ai" | "preset" | "manual";

export interface PhraseInput {
  phrase: string;
  category: string;
}

export interface ValidPhraseInput {
  phrase: string;
  category: PhraseCategory;
}

export type PhraseValidationResult =
  | { ok: true; value: ValidPhraseInput }
  | { ok: false; error: string };

export function validatePhrase(input: unknown): PhraseValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Phrase must be an object" };
  }
  const { phrase, category } = input as Record<string, unknown>;
  if (typeof phrase !== "string" || typeof category !== "string") {
    return { ok: false, error: "phrase and category must be strings" };
  }
  if (!PHRASE_CATEGORIES.includes(category as PhraseCategory)) {
    return { ok: false, error: "Invalid phrase category" };
  }

  const cleaned = phrase.normalize("NFKC").trim().replace(/\s+/g, " ");
  const words = cleaned.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) ?? [];
  if (
    cleaned.length < 5 ||
    cleaned.length > 160 ||
    words.length < 2 ||
    words.length > 16 ||
    !/[A-Za-z]/.test(cleaned) ||
    /_{2,}|-{3,}|\b(?:n\/a|none|null|unknown)\b/i.test(cleaned)
  ) {
    return {
      ok: false,
      error: "Phrase must be a useful English phrase of 2–16 words",
    };
  }
  return {
    ok: true,
    value: { phrase: cleaned, category: category as PhraseCategory },
  };
}

export interface StoredPhrase {
  id: number;
  content: string;
  category: string;
  source: string;
  language: string;
}

interface PhraseTransaction {
  phrase: {
    findMany(args: {
      where: { language: string };
    }): Promise<StoredPhrase[]>;
    create(args: {
      data: {
        content: string;
        category: PhraseCategory;
        source: PhraseSource;
        language: "en";
      };
    }): Promise<StoredPhrase>;
    update(args: {
      where: { id: number };
      data: { category: PhraseCategory };
    }): Promise<StoredPhrase>;
  };
}

export interface PhraseDatabase {
  $transaction<T>(operation: (tx: PhraseTransaction) => Promise<T>): Promise<T>;
}

export interface PhrasePersistenceResult {
  outcome: "success" | "partial" | "failure";
  saved: StoredPhrase[];
  duplicates: number;
  rejected: Array<{ input: unknown; error: string }>;
  error?: string;
}

export async function persistPhrases(
  inputs: readonly unknown[],
  source: PhraseSource,
  db: PhraseDatabase,
): Promise<PhrasePersistenceResult> {
  const rejected: PhrasePersistenceResult["rejected"] = [];
  const valid: ValidPhraseInput[] = [];
  const seen = new Set<string>();
  let duplicates = 0;

  for (const input of inputs) {
    const parsed = validatePhrase(input);
    if (!parsed.ok) {
      rejected.push({ input, error: parsed.error });
      continue;
    }
    const key = normalizeForDedupe(parsed.value.phrase);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    valid.push(parsed.value);
  }

  if (valid.length === 0) {
    return {
      outcome: rejected.length > 0 ? "failure" : "success",
      saved: [],
      duplicates,
      rejected,
    };
  }

  try {
    const saved = await db.$transaction(async (tx) => {
      const existing = await tx.phrase.findMany({ where: { language: "en" } });
      const byKey = new Map(
        existing.map((phrase) => [normalizeForDedupe(phrase.content), phrase]),
      );
      const rows: StoredPhrase[] = [];
      for (const item of valid) {
        const key = normalizeForDedupe(item.phrase);
        const prior = byKey.get(key);
        if (prior) {
          duplicates++;
          const row =
            source === "manual" && prior.category !== item.category
              ? await tx.phrase.update({
                  where: { id: prior.id },
                  data: { category: item.category },
                })
              : prior;
          rows.push(row);
          continue;
        }
        const row = await tx.phrase.create({
          data: {
            content: item.phrase,
            category: item.category,
            source,
            language: "en",
          },
        });
        byKey.set(key, row);
        rows.push(row);
      }
      return rows;
    });
    return {
      outcome: rejected.length > 0 ? "partial" : "success",
      saved,
      duplicates,
      rejected,
    };
  } catch (error) {
    console.error("Phrase persistence transaction failed:", error);
    return {
      outcome: "failure",
      saved: [],
      duplicates,
      rejected,
      error: "Phrase database operation failed",
    };
  }
}
