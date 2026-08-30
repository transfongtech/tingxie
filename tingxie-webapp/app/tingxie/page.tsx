import { WeeklyPractice } from "@/components/WeeklyPractice";
import { ArrowRight, Brain, Clock, Settings, Trophy, Home as HomeIcon, Sparkles, Play } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";
import { LanguageHeader } from "@/components/LanguageHeader";

async function getWeeksData(lang: Language) {
  const weeks = await prisma.week.findMany({
    where: {
      language: lang,
    },
    include: {
      wordLists: {
        include: {
          word: {
            include: {
              progress: true,
            },
          },
        },
      },
    },
    orderBy: {
      number: "asc",
    },
  });

  return weeks.map((week) => {
    const totalWords = week.wordLists.length;
    let completed = 0;
    if (totalWords > 0) {
      const masteredCount = week.wordLists.filter(
        (wl) => wl.word.progress?.isMastered
      ).length;
      completed = Math.round((masteredCount / totalWords) * 100);
    }

    const now = new Date();
    const mistakesCount = week.wordLists.filter(
      (wl) => wl.word.progress && wl.word.progress.stage === 0 && wl.word.progress.lastReviewDate !== null
    ).length;
    const dueCount = week.wordLists.filter(
      (wl) => wl.word.progress && wl.word.progress.nextReviewDate <= now
    ).length;

    return {
      id: week.id,
      number: week.number,
      grade: week.grade || 3,
      term: week.term || 1,
      title: week.title,
      wordCount: totalWords,
      mistakesCount,
      dueCount,
      completed: completed,
      isActive: week.isActive,
      language: week.language,
    };
  });
}

async function getDashboardStats(lang: Language) {
  const now = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  const languageFilter = {
    word: {
      wordLists: {
        some: {
          week: {
            language: lang,
          },
        },
      },
    },
  };

  const dueProgress = await prisma.learningProgress.findMany({
    where: {
      AND: [
        {
          OR: [
            { nextReviewDate: { lte: now } },
            { stage: 0, lastReviewDate: { not: null } },
          ],
        },
        languageFilter,
      ],
    },
    select: { wordId: true },
  });
  const dueIds = new Set(dueProgress.map((p) => p.wordId));

  const upcomingWeeks = await prisma.week.findMany({
    where: {
      language: lang,
      dictationDate: {
        gte: now,
        lte: nextWeek,
      },
    },
    include: {
      wordLists: { select: { wordId: true } },
    },
  });

  upcomingWeeks.forEach((w) => {
    w.wordLists.forEach((wl) => {
      dueIds.add(wl.wordId);
    });
  });

  const dueToday = dueIds.size;

  const mastered = await prisma.learningProgress.count({
    where: {
      isMastered: true,
      ...languageFilter,
    },
  });

  const mistakes = await prisma.learningProgress.count({
    where: {
      stage: 0,
      lastReviewDate: {
        not: null,
      },
      ...languageFilter,
    },
  });

  const logs = await prisma.reviewLog.findMany({
    where: {
      word: {
        wordLists: {
          some: {
            week: {
              language: lang,
            },
          },
        },
      },
    },
    select: {
      reviewDate: true,
    },
    orderBy: {
      reviewDate: "desc",
    },
  });

  const uniqueDates = new Set<string>();
  logs.forEach((log) => {
    uniqueDates.add(log.reviewDate.toISOString().split("T")[0]);
  });

  const sortedDates = Array.from(uniqueDates).sort().reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split("T")[0];

  let streak = 0;
  let currentCheck = today;

  if (!uniqueDates.has(today)) {
    if (uniqueDates.has(yesterday)) {
      currentCheck = yesterday;
    } else {
      currentCheck = "";
    }
  }

  if (currentCheck) {
    streak = 0;
    let idx = sortedDates.indexOf(currentCheck);
    if (idx !== -1) {
      streak = 1;
      for (let i = idx; i < sortedDates.length - 1; i++) {
        const curr = new Date(sortedDates[i]);
        const next = new Date(sortedDates[i + 1]);
        const diffTime = Math.abs(curr.getTime() - next.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) streak++;
        else break;
      }
    }
  }

  return { dueToday, mastered, streak, mistakes };
}

export const dynamic = "force-dynamic";

export default async function TingxieDashboard() {
  const cookieStore = await cookies();
  const lang =
    (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;

  const weeks = await getWeeksData(lang);
  const stats = await getDashboardStats(lang);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 text-[#2D2D2D]">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2.5 bg-white border border-amber-100 rounded-xl hover:bg-amber-50 text-gray-600 transition-colors shadow-xs"
            title="返回首页选择"
          >
            <HomeIcon className="w-5 h-5 text-indigo-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Tingxie Practice 2.1
            </h1>
            <p className="text-gray-500 mt-1">
              Hi George！欢迎开始今天的听写与 Spelling 练习
            </p>
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <LanguageHeader currentLang={lang} />
          <Link href="/manage">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 shadow-sm transition-all min-h-[44px]">
              <Settings className="w-4 h-4" />
              家长管理后台
            </button>
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/practice/mistakes"
          className="bg-amber-50/60 p-5 rounded-2xl border border-amber-200/60 shadow-xs flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="p-3 bg-white text-amber-600 rounded-xl shadow-xs group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-900">{stats.mistakes}</div>
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              错题巩固加练
            </div>
          </div>
        </Link>

        <Link
          href="/practice/due"
          className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shadow-xs group-hover:scale-105 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.dueToday}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              记忆曲线练习
            </div>
          </div>
        </Link>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.mastered}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              已掌握单词
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.streak}</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              连续练习天数
            </div>
          </div>
        </div>
      </div>

      {/* ─── Composition Spelling Bank Bucket ─── */}
      {(() => {
        const compoBucket = weeks.find((w) => w.number === 0);
        if (!compoBucket) return null;

        return (
          <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 text-white rounded-3xl p-6 md:p-8 shadow-md relative overflow-hidden flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-2 max-w-xl relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-300/30 text-xs font-bold rounded-full backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" /> Composition Vocabulary Bucket
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">
                Composition Spelling Bank (作文积累词库)
              </h2>
              <p className="text-sm text-violet-100/90 leading-relaxed">
                专属收录作文练习中收集的高频好词与易错拼写，独立复习不与课堂周词表混淆。
              </p>
              <div className="flex items-center gap-4 pt-1 text-xs text-amber-200 font-semibold flex-wrap">
                <span>📖 共 {compoBucket.wordCount} 个积累单词</span>
                <span>•</span>
                <span>错题加练: {compoBucket.mistakesCount} 个</span>
                <span>•</span>
                <span>艾宾浩斯复习: {compoBucket.dueCount} 个</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
              {/* 1. 错题专项加练 */}
              <Link href={`/practice/${compoBucket.id}?lang=en&mode=mistakes`}>
                <button className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-xl font-bold text-xs backdrop-blur-xs transition flex items-center gap-1.5 min-h-[44px]">
                  <Brain className="w-4 h-4" /> 错题加练 ({compoBucket.mistakesCount})
                </button>
              </Link>

              {/* 2. 艾宾浩斯记忆复习 */}
              <Link href={`/practice/${compoBucket.id}?lang=en&mode=due`}>
                <button className="px-3.5 py-2.5 bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-100 border border-indigo-300/30 rounded-xl font-bold text-xs backdrop-blur-xs transition flex items-center gap-1.5 min-h-[44px]">
                  <Clock className="w-4 h-4 text-indigo-300" /> 艾宾浩斯复习 ({compoBucket.dueCount})
                </button>
              </Link>

              {/* 3. 全量听写 */}
              <Link href={`/practice/${compoBucket.id}?lang=en&mode=all`}>
                <button className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5 min-h-[44px]">
                  <Play className="w-4 h-4 fill-current text-slate-950" /> 全量听写 →
                </button>
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Main Content Areas */}
      <div className="space-y-6">
        <WeeklyPractice weeks={weeks} handwritingMode={false} />
      </div>
    </main>
  );
}
