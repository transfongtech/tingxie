import { prisma } from "@/lib/prisma";
import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmissionTabs } from "@/components/essay/SubmissionTabs";
import { SubmissionSelector } from "@/components/essay/SubmissionSelector";
import { ReviewHistory } from "@/components/essay/ReviewHistory";
import { ReviewStatus } from "@/components/essay/ReviewStatus";
import { deserializeEssayFeedback } from "@/lib/essay-feedback-persistence";
import {
  orderReviewVersions,
  summarizeReviewChange,
  type ReviewHistorySource,
} from "@/lib/review-history";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}

export default async function EssaySubmissionDetail({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { version } = await searchParams;
  const submissionId = parseInt(id, 10);

  if (isNaN(submissionId)) {
    notFound();
  }

  const submission = await prisma.essaySubmission.findUnique({
    where: { id: submissionId },
    include: {
      prompt: true,
      feedbacks: {
        orderBy: { versionNumber: "desc" },
        select: {
          id: true,
          versionNumber: true,
          status: true,
          isCurrent: true,
          contentScore: true,
          languageScore: true,
          totalScore: true,
          summary: true,
          annotations: true,
          reviewResultJson: true,
          qualityMetadataJson: true,
          failureMessage: true,
          engineVersion: true,
          createdAt: true,
        },
      },
    },
  });

  if (!submission) {
    notFound();
  }
  const history = orderReviewVersions(submission.feedbacks);
  const successfulHistory = history.filter((item) => item.status === "success");
  const currentFeedback = successfulHistory.find((item) => item.isCurrent);
  const requestedVersion = version ? Number.parseInt(version, 10) : undefined;
  const selectedFeedback =
    successfulHistory.find((item) => item.versionNumber === requestedVersion) ??
    currentFeedback;
  if (!selectedFeedback || !currentFeedback) {
    const latestFailure = history.find((item) => item.status === "failed");
    const status =
      submission.status === "reviewing"
        ? "reviewing"
        : submission.status === "review_failed"
          ? "review_failed"
          : "submitted";
    return (
      <main className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6 md:px-6">
        <header className="flex items-center gap-3 border-b border-amber-200/40 pb-4">
          <Link
            href="/essay"
            className="rounded-xl border border-amber-100 bg-white p-2.5 text-gray-600 shadow-xs"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-xs font-medium text-gray-500">
              Topic: {submission.prompt.title} • {submission.wordCount} words
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Composition review</h1>
          </div>
        </header>
        <ReviewStatus
          submissionId={submissionId}
          status={status}
          initialError={latestFailure?.failureMessage}
        />
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold text-gray-900">Submitted composition</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {submission.essayText}
          </p>
        </section>
      </main>
    );
  }
  const [feedback, siblingSubmissions] = await Promise.all([
    prisma.essayFeedback.findUnique({
      where: { id: selectedFeedback.id },
    }),
    prisma.essaySubmission.findMany({
      where: {
        promptId: submission.promptId,
        status: "reviewed",
      },
      select: {
        id: true,
        wordCount: true,
        submittedAt: true,
        feedbacks: {
          where: { isCurrent: true, status: "success" },
          select: { totalScore: true },
          take: 1,
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);
  if (!feedback) notFound();

  const reviewResult = deserializeEssayFeedback(feedback);

  // 构建选择器数据
  const selectorItems = siblingSubmissions.map((s, idx) => ({
    id: s.id,
    score: s.feedbacks[0]?.totalScore ?? null,
    wordCount: s.wordCount,
    submittedAt: s.submittedAt.toISOString(),
    label: `#${siblingSubmissions.length - idx}`,
  }));

  return (
    <main className="w-full px-4 md:px-6 lg:px-8 py-4 space-y-4 text-[#2D2D2D]">
      {/* Navigation Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-200/40 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/essay"
            className="p-2.5 bg-white border border-amber-100 rounded-xl hover:bg-amber-50 text-gray-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1">
              <span>Topic: {submission.prompt.title}</span>
              <span>•</span>
              <span>Submitted {new Date(submission.submittedAt).toLocaleDateString()}</span>
              <span>•</span>
              <span className="font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">{submission.wordCount} words</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Composition Review Result
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Submission Selector */}
          {selectorItems.length > 1 && (
            <SubmissionSelector
              items={selectorItems}
              currentId={submissionId}
            />
          )}

          <Link href={`/essay/prompt/${submission.promptId}`}>
            <button className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors min-h-[40px]">
              <RotateCcw className="w-4 h-4 text-violet-600" /> Rewrite Topic ✍️
            </button>
          </Link>
        </div>
      </header>

      {feedback.id !== currentFeedback.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
          You are viewing historical version {feedback.versionNumber}. It is read-only.
          {" "}
          <Link className="font-bold underline" href={`/essay/submission/${submissionId}`}>
            Return to current
          </Link>
        </div>
      )}

      <ReviewHistory
        submissionId={submissionId}
        activeVersion={feedback.versionNumber}
        items={history.map((item) => {
          const previous = successfulHistory.find(
            (candidate) =>
              candidate.versionNumber < item.versionNumber,
          );
          return {
            id: item.id,
            versionNumber: item.versionNumber,
            status: item.status,
            isCurrent: item.id === currentFeedback.id,
            engineVersion: item.engineVersion,
            createdAt: item.createdAt.toISOString(),
            failureMessage: item.failureMessage,
            comparison:
              item.status === "success" && previous
                ? summarizeReviewChange(
                    item as ReviewHistorySource,
                    previous as ReviewHistorySource,
                  )
                : null,
          };
        })}
      />

      {/* Tab Navigation & Tab Content */}
      <SubmissionTabs
        originalText={submission.essayText}
        reviewResult={reviewResult}
        totalScore={feedback.totalScore}
        promptTitle={submission.prompt.title}
      />
    </main>
  );
}
