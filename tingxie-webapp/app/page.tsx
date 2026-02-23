import { WeeklyPractice } from "@/components/WeeklyPractice";
import { ArrowRight, Brain, Clock, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";
import { LanguageHeader } from "@/components/LanguageHeader";
import { HandwritingToggle } from "@/components/HandwritingToggle";
import { HANDWRITING_COOKIE } from "@/lib/handwriting-mode";

const prisma = new PrismaClient();

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
              progress: true
            }
          }
        }
      },
    },
    orderBy: {
      number: 'asc',
    },
  });

  return weeks.map(week => {
    // Determine completion status
    const totalWords = week.wordLists.length;
    let completed = 0;
    if (totalWords > 0) {
      const masteredCount = week.wordLists.filter(wl => wl.word.progress?.isMastered).length;
      completed = Math.round((masteredCount / totalWords) * 100);
    }

    return {
      id: week.id,
      number: week.number,
      title: week.title,
      wordCount: totalWords,
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

  // Helper to filter by language via Week association
  // We want to find LearningProgress/Words that belong to a Week with language = lang.
  // Prisma relation: LearningProgress -> Word -> WordList -> Week
  const languageFilter = {
    word: {
      wordLists: {
        some: {
          week: {
            language: lang
          }
        }
      }
    }
  };

  // 1. Due Today & Upcoming
  // A. Progress based (Due or New Mistakes) + Language Filter
  const dueProgress = await prisma.learningProgress.findMany({
    where: {
      AND: [
        {
          OR: [
            { nextReviewDate: { lte: now } },
            { stage: 0, lastReviewDate: { not: null } }
          ]
        },
        languageFilter
      ]
    },
    select: { wordId: true }
  });
  const dueIds = new Set(dueProgress.map(p => p.wordId));

  // B. Upcoming Dictation based (Weeks matching language)
  const upcomingWeeks = await prisma.week.findMany({
    where: {
      language: lang,
      dictationDate: {
        gte: now,
        lte: nextWeek
      }
    },
    include: {
      wordLists: { select: { wordId: true } }
    }
  });

  upcomingWeeks.forEach(w => {
    w.wordLists.forEach(wl => {
      dueIds.add(wl.wordId);
    });
  });

  const dueToday = dueIds.size;

  // 2. Mastered + Language Filter
  const mastered = await prisma.learningProgress.count({
    where: {
      isMastered: true,
      ...languageFilter
    },
  });

  // 3. Mistakes + Language Filter
  const mistakes = await prisma.learningProgress.count({
    where: {
      stage: 0,
      lastReviewDate: {
        not: null,
      },
      ...languageFilter
    },
  });

  // 4. Day Streak (Filtered by Language)
  // Check logs for words belonging to the current language
  const logs = await prisma.reviewLog.findMany({
    where: {
      word: {
        wordLists: {
          some: {
            week: {
              language: lang
            }
          }
        }
      }
    },
    select: {
      reviewDate: true,
    },
    orderBy: {
      reviewDate: 'desc',
    },
  });

  const uniqueDates = new Set<string>();
  logs.forEach(log => {
    uniqueDates.add(log.reviewDate.toISOString().split('T')[0]);
  });

  const sortedDates = Array.from(uniqueDates).sort().reverse();
  const today = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().split('T')[0];

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
        if (diffDays === 1) streak++; else break;
      }
    }
  }

  return { dueToday, mastered, streak, mistakes };
}

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const lang = (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;
  const handwritingMode = cookieStore.get(HANDWRITING_COOKIE)?.value === "true";

  const weeks = await getWeeksData(lang);
  const stats = await getDashboardStats(lang);

  return (
    <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
            Tingxie Practice
          </h1>
          <p className="text-slate-500 mt-1">
            Master your spelling with intelligent audio flashcards
          </p>
        </div>

        <div className="flex gap-3 items-center">
          <LanguageHeader currentLang={lang} />
          <HandwritingToggle enabled={handwritingMode} />
          <Link href="/import">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all hover:shadow-indigo-300">
              <Plus className="w-4 h-4" />
              Add Words
            </button>
          </Link>
        </div>
      </header>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/practice/mistakes" className="bg-rose-50 p-5 rounded-xl border border-rose-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group">
          <div className="p-3 bg-white text-rose-500 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-700">{stats.mistakes}</div>
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wide">Mistakes Review</div>
          </div>
        </Link>

        <Link href="/practice/due" className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.dueToday}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Due Today</div>
          </div>
        </Link>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.mastered}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Mastered</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
            <ArrowRight className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stats.streak}</div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Day Streak</div>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="space-y-6">
        <WeeklyPractice weeks={weeks} handwritingMode={handwritingMode} />
      </div>
    </main>
  );
}
