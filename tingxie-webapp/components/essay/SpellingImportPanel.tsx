"use client";

import { useMemo, useState } from "react";
import type {
  SpellingErrorInput,
  SpellingImportResult,
} from "@/lib/spelling-import";
import { normalizeForDedupe } from "@/lib/spelling-import";

export interface SpellingImportPanelProps {
  spellingErrors: readonly SpellingErrorInput[];
  endpoint?: string;
  onComplete?: (result: SpellingImportResult) => void;
}

export function SpellingImportPanel({
  spellingErrors,
  endpoint = "/api/essay/import-spelling",
  onComplete,
}: SpellingImportPanelProps) {
  const uniqueErrors = useMemo(() => {
    const seen = new Set<string>();
    return spellingErrors.filter((item) => {
      const key = normalizeForDedupe(item.correct);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [spellingErrors]);
  const [selected, setSelected] = useState(() =>
    new Set(uniqueErrors.map((item) => normalizeForDedupe(item.correct))),
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SpellingImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function importSelected() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spellingErrors: uniqueErrors.filter((item) =>
            selected.has(normalizeForDedupe(item.correct)),
          ),
        }),
      });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object" || !("outcome" in payload)) {
        throw new Error("The spelling service returned an invalid response");
      }
      const nextResult = payload as SpellingImportResult;
      setResult(nextResult);
      onComplete?.(nextResult);
      if (!response.ok && response.status !== 207) {
        setError(nextResult.error ?? "Spelling import failed");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Spelling import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3" aria-label="Spelling import">
      <div className="space-y-2">
        {uniqueErrors.map((item) => {
          const key = normalizeForDedupe(item.correct);
          return (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(key)}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              />
              <span>{item.wrong} → {item.correct}</span>
            </label>
          );
        })}
      </div>
      <button
        type="button"
        disabled={loading || selected.size === 0}
        onClick={importSelected}
      >
        {loading ? "Importing…" : "Add to spelling practice"}
      </button>
      {result && (
        <p role="status">
          Imported {result.imported}; {result.duplicates} already present;{" "}
          {result.rejected + result.failed} not imported.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
