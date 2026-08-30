import { prisma } from "@/lib/prisma";
import { ModuleSelector } from "@/components/ModuleSelector";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

async function getHubStats() {
  const now = new Date();

  // 1. 听写数据
  const dueCount = await prisma.learningProgress.count({
    where: {
      OR: [
        { nextReviewDate: { lte: now } },
        { stage: 0, lastReviewDate: { not: null } },
      ],
    },
  });

  const masteredCount = await prisma.learningProgress.count({
    where: { isMastered: true },
  });

  // 2. 作文数据
  const essayCount = await prisma.essaySubmission.count();

  const latestFeedback = await prisma.essayFeedback.findFirst({
    orderBy: { createdAt: "desc" },
    select: { totalScore: true },
  });

  const avgFeedback = await prisma.essayFeedback.aggregate({
    _avg: { totalScore: true },
  });

  return {
    tingxieDue: dueCount,
    tingxieMastered: masteredCount,
    essayCount,
    latestScore: latestFeedback ? latestFeedback.totalScore : null,
    avgScore: avgFeedback._avg.totalScore ? Math.round(avgFeedback._avg.totalScore) : null,
  };
}

export default async function LearningHub() {
  const stats = await getHubStats();

  return (
    <main className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 md:p-12 flex flex-col justify-between">
      <div className="max-w-5xl mx-auto w-full space-y-10">
        {/* Header */}
        <header className="border-b border-amber-200/50 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" /> George's Learning Hub 2.5
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            请选择今天的练习内容
          </h1>
          <p className="text-gray-500 mt-2">
            Welcome back, George! Choose your practice module for today.
          </p>
        </header>

        {/* Module Selector */}
        <ModuleSelector stats={stats} />
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full pt-12 text-center text-xs text-gray-400">
        Tingxie Practice & Composition Learning System • Singapore PSLE Continuous Writing Calibrated
      </footer>
    </main>
  );
}
