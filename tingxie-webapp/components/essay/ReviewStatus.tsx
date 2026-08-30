"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, RefreshCw } from "lucide-react";

import { requestPersistedEssayReview } from "./review-request-client";

export function ReviewStatus({
  submissionId,
  status,
  initialError,
  onSuccess,
}: {
  submissionId: number;
  status: "submitted" | "reviewing" | "review_failed";
  initialError?: string | null;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const runningRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(initialError ?? null);

  async function retry() {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setError(null);
    try {
      await requestPersistedEssayReview(submissionId);
      if (onSuccess) {
        onSuccess();
      } else {
        router.refresh();
      }
    } catch (cause) {
      console.error("Essay review retry failed.", cause);
      setError(
        cause instanceof Error
          ? cause.message
          : "The review could not be completed. Your composition is safe; please retry.",
      );
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }

  const isPending = status === "reviewing";
  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border p-5 ${
        error || status === "review_failed"
          ? "border-red-200 bg-red-50"
          : "border-violet-200 bg-violet-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {isPending && !error ? (
          <LoaderCircle className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-600" />
        ) : (
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        )}
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">
            {isPending && !error ? "Review in progress" : "Review needs attention"}
          </h2>
          <p className="mt-1 text-sm text-gray-700">
            {error ??
              (isPending
                ? "The composition is saved. Refresh this page shortly, or retry if the review stopped."
                : "The composition is saved, but no review is available yet. Please retry.")}
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={running}
            className="mt-4 flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {running ? "Reviewing…" : "Retry review"}
          </button>
        </div>
      </div>
    </section>
  );
}
