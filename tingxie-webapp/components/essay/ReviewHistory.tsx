"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check, History, LoaderCircle, RefreshCw } from "lucide-react";

import type { ReviewChangeSummary } from "@/lib/review-history";
import { requestPersistedEssayReview } from "./review-request-client";

export interface ReviewHistoryItem {
  id: number;
  versionNumber: number;
  status: string;
  isCurrent: boolean;
  engineVersion: string;
  createdAt: string;
  failureMessage: string | null;
  comparison: ReviewChangeSummary | null;
}

export function ReviewHistory({
  submissionId,
  activeVersion,
  items,
}: {
  submissionId: number;
  activeVersion: number;
  items: ReviewHistoryItem[];
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  async function regrade() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);
    try {
      await requestPersistedEssayReview(submissionId);
      router.push(`/essay/submission/${submissionId}`);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The re-review failed. Your current review was preserved.",
      );
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-gray-900">
          <History className="h-4 w-4 text-violet-600" /> Review history
        </h2>
        <button
          type="button"
          onClick={regrade}
          disabled={running}
          className="flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {running ? "Reviewing…" : "Re-review with latest engine"}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error} You can try again.</span>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-xl border p-3 text-sm ${
              item.versionNumber === activeVersion
                ? "border-violet-300 bg-violet-50"
                : "border-gray-100"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {item.status === "success" ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="font-bold">Version {item.versionNumber}</span>
                {item.isCurrent && (
                  <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">
                    Current
                  </span>
                )}
                <span className="text-xs text-gray-500">{item.engineVersion}</span>
              </div>
              {item.status === "success" &&
                (item.versionNumber === activeVersion ? (
                  <span className="text-xs font-medium text-violet-700">Viewing</span>
                ) : (
                  <Link
                    className="text-xs font-bold text-violet-700 hover:underline"
                    href={`/essay/submission/${submissionId}?version=${item.versionNumber}`}
                  >
                    View read-only
                  </Link>
                ))}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {new Date(item.createdAt).toLocaleString()}
            </div>
            {item.status === "failed" && (
              <p className="mt-2 text-xs text-red-700">
                Re-review failed: {item.failureMessage ?? "Unknown error"}. The current
                successful review was preserved.
              </p>
            )}
            {item.comparison && (
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-700">
                <span>Content {signed(item.comparison.contentDelta)}</span>
                <span>Language {signed(item.comparison.languageDelta)}</span>
                <span>Total {signed(item.comparison.totalDelta)}</span>
                <span>Main feedback {item.comparison.feedbackChanged ? "changed" : "unchanged"}</span>
                <span>Next steps {item.comparison.nextStepsChanged ? "changed" : "unchanged"}</span>
                {Object.entries(item.comparison.annotationDeltas).map(([type, delta]) => (
                  <span key={type}>{type} annotations {signed(delta)}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
