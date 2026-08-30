"use client";

import { useMemo, useState } from "react";
import type { EssayReviewResult } from "@/lib/essay-types";
import { BookOpen, CheckCircle, CheckSquare, Filter, Loader2, Square } from "lucide-react";
import { ChildFeedback } from "./ChildFeedback";
import { ParentDetails } from "./ParentDetails";
import { buildEssayFeedbackViewModel } from "./feedback-view-model";

interface ScoreCardProps {
  reviewResult: EssayReviewResult;
}

export function ScoreCard({ reviewResult }: ScoreCardProps) {
  const [importing, setImporting] = useState(false);
  const [importedSuccess, setImportedSuccess] = useState<number | null>(null);
  const feedback = buildEssayFeedbackViewModel(reviewResult);

  const uniqueErrors = useMemo(() => {
    const seen = new Set<string>();
    const list: { wrong: string; correct: string }[] = [];
    for (const error of reviewResult.spellingErrors ?? []) {
      const correct = error.correct.trim();
      const key = correct.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        list.push({ wrong: error.wrong, correct });
      }
    }
    return list;
  }, [reviewResult.spellingErrors]);

  const [selectedWords, setSelectedWords] = useState<string[]>(() =>
    uniqueErrors.map((error) => error.correct),
  );

  const toggleWord = (word: string) => {
    setSelectedWords((selected) =>
      selected.includes(word)
        ? selected.filter((item) => item !== word)
        : [...selected, word],
    );
  };

  const toggleAll = () => {
    setSelectedWords((selected) =>
      selected.length === uniqueErrors.length
        ? []
        : uniqueErrors.map((error) => error.correct),
    );
  };

  const handleImportSpelling = async () => {
    if (selectedWords.length === 0) return;
    const spellingErrors = uniqueErrors.filter((error) =>
      selectedWords.includes(error.correct),
    );

    setImporting(true);
    try {
      const response = await fetch("/api/essay/import-spelling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spellingErrors }),
      });
      const data: unknown = await response.json();
      if (
        response.ok &&
        typeof data === "object" &&
        data !== null &&
        "success" in data &&
        data.success === true &&
        "imported" in data &&
        typeof data.imported === "number"
      ) {
        setImportedSuccess(data.imported);
      }
    } catch (error) {
      console.error("Failed to import spelling errors:", error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <ChildFeedback feedback={feedback} />
      <ParentDetails feedback={feedback} legacyScores={reviewResult.scores} />

      {uniqueErrors.length > 0 && (
        <section aria-labelledby="spelling-practice-heading" className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="spelling-practice-heading" className="flex items-center gap-2 text-base font-bold text-amber-950">
                <Filter aria-hidden="true" className="h-4 w-4" />
                Words to practise
              </h3>
              <p className="mt-1 text-sm leading-6 text-amber-950/80">
                Choose the useful words you would like to practise next.
              </p>
            </div>
            <button type="button" onClick={toggleAll} className="min-h-11 rounded-lg px-3 text-sm font-bold text-amber-950 underline focus-visible:outline-2 focus-visible:outline-violet-600">
              {selectedWords.length === uniqueErrors.length ? "Deselect all" : "Select all"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            {uniqueErrors.map((item) => {
              const selected = selectedWords.includes(item.correct);
              return (
                <button
                  type="button"
                  key={item.correct}
                  aria-pressed={selected}
                  onClick={() => toggleWord(item.correct)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                    selected
                      ? "border-amber-700 bg-amber-700 text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {selected ? <CheckSquare aria-hidden="true" className="h-4 w-4" /> : <Square aria-hidden="true" className="h-4 w-4" />}
                  <span>{item.wrong}</span>
                  <span aria-hidden="true">→</span>
                  <span className="font-extrabold">{item.correct}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200 pt-4">
            <span className="text-sm font-medium text-amber-950">
              {selectedWords.length} of {uniqueErrors.length} selected
            </span>
            <button
              type="button"
              onClick={handleImportSpelling}
              disabled={importing || importedSuccess !== null || selectedWords.length === 0}
              className="flex min-h-11 items-center gap-2 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {importing ? (
                <><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> Importing…</>
              ) : importedSuccess !== null ? (
                <><CheckCircle aria-hidden="true" className="h-4 w-4" /> Added {importedSuccess} words</>
              ) : (
                <><BookOpen aria-hidden="true" className="h-4 w-4" /> Add to practice</>
              )}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
