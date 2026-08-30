import type { EssayReviewResult } from "@/lib/essay-types";
import type { EssayAssessment } from "@/lib/essay-review/schema";
import type { EssayFeedbackViewModel } from "./feedback-view-model";
import { ChevronDown } from "lucide-react";

interface ParentDetailsProps {
  feedback: EssayFeedbackViewModel;
  legacyScores: EssayReviewResult["scores"];
}

export function ParentDetails({ feedback, legacyScores }: ParentDetailsProps) {
  const assessment = feedback.assessment;
  const scores = assessment?.scores ?? legacyScores;
  const metadata = feedback.qualityMetadata;

  return (
    <details className="group rounded-3xl border border-slate-200 bg-white shadow-xs">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-6 py-4 text-base font-extrabold text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600">
        <span>
          Parent Details
          <span className="ml-2 text-sm font-medium text-slate-600">
            Scores, evidence and review information
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-600 transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-6 border-t border-slate-200 px-6 py-6">
        {feedback.isLegacy && (
          <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            Earlier review format: bands, assessment evidence and engine metadata
            were not recorded. Available scores and breakdown comments are shown.
          </p>
        )}

        <section aria-labelledby="psle-scores-heading">
          <h3 id="psle-scores-heading" className="text-lg font-bold text-gray-900">
            PSLE Continuous Writing assessment
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Total {scores.content + scores.language}/36 · Content {scores.content}/18
            {" · "}Language {scores.language}/18
          </p>
          {assessment ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AssessmentArea
                title={`Content · ${assessment.bands.content}`}
                evidence={assessment.evidence.content}
                breakdown={assessment.contentBreakdown}
              />
              <AssessmentArea
                title={`Language · ${assessment.bands.language}`}
                evidence={assessment.evidence.language}
                breakdown={assessment.languageBreakdown}
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <LegacyArea title="Content · band unavailable" breakdown={legacyScores.contentBreakdown} />
              <LegacyArea title="Language · band unavailable" breakdown={legacyScores.languageBreakdown} />
            </div>
          )}
        </section>

        <section aria-labelledby="review-info-heading" className="border-t border-slate-200 pt-5">
          <h3 id="review-info-heading" className="text-base font-bold text-gray-900">
            Rubric and review information
          </h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Detail label="Rubric" value="Singapore PSLE Continuous Writing · 36 marks" />
            <Detail label="Schema" value={feedback.isLegacy ? "Earlier review format" : "Essay review 2.0"} />
            <Detail label="Engine" value={metadata?.engineVersion} />
            <Detail label="Prompt" value={metadata?.promptVersion} />
            <Detail label="Model" value={metadata?.model} />
            <Detail
              label="Generated"
              value={metadata?.generatedAt}
            />
          </dl>
          {metadata?.warnings && metadata.warnings.length > 0 && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              <strong>Review notes:</strong> {metadata.warnings.join(" ")}
            </div>
          )}
        </section>
      </div>
    </details>
  );
}

function AssessmentArea({
  title,
  evidence,
  breakdown,
}: {
  title: string;
  evidence: string[];
  breakdown: EssayAssessment["contentBreakdown"] | EssayAssessment["languageBreakdown"];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 className="font-extrabold text-gray-900">{title}</h4>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-600">Evidence</p>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
        {evidence.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
      </ul>
      <Breakdown breakdown={breakdown} />
    </div>
  );
}

function LegacyArea({
  title,
  breakdown,
}: {
  title: string;
  breakdown:
    | EssayReviewResult["scores"]["contentBreakdown"]
    | EssayReviewResult["scores"]["languageBreakdown"];
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <h4 className="font-extrabold text-gray-900">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">Assessment evidence unavailable.</p>
      <Breakdown breakdown={breakdown} />
    </div>
  );
}

function Breakdown({
  breakdown,
}: {
  breakdown:
    | EssayAssessment["contentBreakdown"]
    | EssayAssessment["languageBreakdown"];
}) {
  return (
    <dl className="mt-4 space-y-3 border-t border-slate-200 pt-3 text-sm">
      {Object.entries(breakdown).map(([label, value]) => (
        <div key={label}>
          <dt className="font-bold capitalize text-slate-800">{label.replace(/([A-Z])/g, " $1")}</dt>
          <dd className="mt-0.5 leading-6 text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="font-bold text-slate-800">{label}</dt>
      <dd className="mt-0.5 break-words text-slate-600">{value || "Not recorded"}</dd>
    </div>
  );
}
