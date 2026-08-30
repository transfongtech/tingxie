import { prisma } from "@/lib/prisma";
import { PromptCard } from "@/components/essay/PromptCard";
import { EssayPromptData } from "@/lib/essay-types";
import { Home, Plus, PenTool, Award, BarChart3, Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getPromptsData(): Promise<EssayPromptData[]> {
  const prompts = await prisma.essayPrompt.findMany({
    where: { isActive: true },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      submissions: {
        include: {
          feedbacks: {
            where: { isCurrent: true, status: "success" },
            take: 1,
          },
        },
        orderBy: { submittedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return prompts.map((p) => {
    const latestSubmission = p.submissions[0];
    const latestScore = latestSubmission?.feedbacks[0]?.totalScore ?? null;

    return {
      id: p.id,
      title: p.title,
      description: p.description,
      images: p.images.map((img) => ({
        id: img.id,
        imagePath: img.imagePath,
        sortOrder: img.sortOrder,
      })),
      submissionCount: p.submissions.length,
      latestScore,
      isActive: p.isActive,
      createdAt: p.createdAt,
    };
  });
}

async function getCompositionStats() {
  const totalWritten = await prisma.essaySubmission.count();
  const feedbackAgg = await prisma.essayFeedback.aggregate({
    where: { isCurrent: true, status: "success" },
    _avg: { totalScore: true },
    _max: { totalScore: true },
  });

  return {
    totalWritten,
    avgScore: feedbackAgg._avg.totalScore ? Math.round(feedbackAgg._avg.totalScore) : null,
    maxScore: feedbackAgg._max.totalScore ?? null,
  };
}

export default async function CompositionHome() {
  const prompts = await getPromptsData();
  const stats = await getCompositionStats();

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 text-[#2D2D2D]">
      {/* Navigation & Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-200/40 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border border-amber-100 rounded-xl hover:bg-amber-50 text-gray-600 transition-colors shadow-xs"
            title="Back to Hub"
          >
            <Home className="w-5 h-5 text-indigo-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center gap-2">
              Composition Practice
            </h1>
            <p className="text-gray-500 mt-1 text-sm">
              George's Composition Dashboard • PSLE Continuous Writing Calibrated
            </p>
          </div>
        </div>

        <Link href="/essay/prompt/upload">
          <button className="px-4 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-all min-h-[44px]">
            <Plus className="w-4 h-4" />
            Upload New Topic (Parents)
          </button>
        </Link>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <PenTool className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.totalWritten}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Compositions Written
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.avgScore !== null ? `${stats.avgScore}/36` : "No scores yet"}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Average Score (out of 36)
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">
              {stats.maxScore !== null ? `${stats.maxScore}/36` : "No scores yet"}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Personal Best
            </div>
          </div>
        </div>
      </div>

      {/* Prompts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-500" />
            Composition Topics
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            {prompts.length} topics
          </span>
        </div>

        {prompts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-dashed border-amber-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center mx-auto">
              <PenTool className="w-8 h-8 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-gray-900">No Topics Yet</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Ask your parents to upload a composition picture prompt using the button above!
              </p>
            </div>
            <Link href="/essay/prompt/upload" className="inline-block pt-2">
              <button className="px-5 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium text-sm inline-flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Upload First Topic
              </button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
