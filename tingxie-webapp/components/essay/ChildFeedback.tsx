import type { EssayFeedbackViewModel } from "./feedback-view-model";
import { BookOpen, Footprints, Sparkles, Star } from "lucide-react";
import { VoiceFeedback } from "./VoiceFeedback";

interface ChildFeedbackProps {
  feedback: EssayFeedbackViewModel;
}

export function ChildFeedback({ feedback }: ChildFeedbackProps) {
  return (
    <section
      aria-labelledby="child-feedback-heading"
      className="rounded-3xl border border-violet-100 bg-white p-6 shadow-xs md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-sm font-bold text-violet-800">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Your feedback
          </div>
          <h2 id="child-feedback-heading" className="text-2xl font-extrabold text-gray-900">
            Great work — let&apos;s keep growing!
          </h2>
        </div>
        {feedback.summary && <VoiceFeedback text={feedback.summary} />}
      </div>

      {feedback.isLegacy ? (
        <div role="status" className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base leading-7 text-slate-700">
          This is an earlier review. Its original teacher comment is shown below;
          strengths and next steps were not recorded separately.
        </div>
      ) : (
        <div className="grid gap-5">
          <section aria-labelledby="strengths-heading" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
            <h3 id="strengths-heading" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <Star aria-hidden="true" className="h-5 w-5 fill-emerald-200 text-emerald-700" />
              What you did well
            </h3>
            {feedback.strengths.length > 0 ? (
              <ul className="space-y-3">
                {feedback.strengths.map((strength, index) => (
                  <li key={`${index}-${strength}`} className="flex gap-3 text-base font-medium leading-7 text-gray-800 md:text-lg">
                    <span aria-hidden="true" className="font-extrabold text-emerald-700">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-base leading-7 text-slate-700">
                Strengths were not available in this review.
              </p>
            )}
          </section>

          <section aria-labelledby="next-steps-heading" className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5">
            <h3 id="next-steps-heading" className="mb-3 flex items-center gap-2 text-lg font-extrabold text-gray-900">
              <Footprints aria-hidden="true" className="h-5 w-5 text-violet-700" />
              Try these next
            </h3>
            {feedback.nextSteps.length > 0 ? (
              <ol className="space-y-3">
                {feedback.nextSteps.map((step, index) => (
                  <li key={`${index}-${step}`} className="flex gap-3 text-base font-medium leading-7 text-gray-800 md:text-lg">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-violet-300 bg-white text-sm font-extrabold text-violet-800">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-base leading-7 text-slate-700">
                Next steps were not available in this review.
              </p>
            )}
          </section>
        </div>
      )}

      <section aria-labelledby="summary-heading" className="mt-5 rounded-2xl border border-amber-200 bg-[#FEFCF8] p-5">
        <h3 id="summary-heading" className="mb-2 flex items-center gap-2 text-lg font-extrabold text-gray-900">
          <BookOpen aria-hidden="true" className="h-5 w-5 text-amber-700" />
          A note from your teacher
        </h3>
        <p className="whitespace-pre-wrap text-base leading-8 text-gray-800 md:text-lg">
          {feedback.summary || "A teacher summary was not recorded for this review."}
        </p>
      </section>
    </section>
  );
}
