import { PracticeSession } from "@/components/PracticeSession";
import SpellingPractice from "@/components/SpellingPractice";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { pinyin } from "pinyin-pro";
import Link from "next/link";
import { Sparkles, Brain, Clock, ArrowLeft } from "lucide-react";

async function getWeekWords(weekId: number, mode?: string) {
  const week = await prisma.week.findUnique({
    where: { id: weekId },
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
  });

  if (!week) return null;

  const now = new Date();
  let rawLists = week.wordLists;

  if (mode === "mistakes") {
    // 过滤错题/未掌握 (stage === 0 且有复习记录)
    rawLists = rawLists.filter(
      (wl) => wl.word.progress && wl.word.progress.stage === 0 && wl.word.progress.lastReviewDate !== null
    );
  } else if (mode === "due") {
    // 过滤艾宾浩斯记忆曲线到期需要复习的词 (nextReviewDate <= now)
    rawLists = rawLists.filter(
      (wl) => wl.word.progress && wl.word.progress.nextReviewDate <= now
    );
  }

  const words = rawLists.map((wl) => {
    const content = wl.word.content;
    const py = content.length <= 8 ? pinyin(content) : null;
    return {
      id: wl.word.id,
      content: content,
      pinyin: py,
    };
  });

  words.sort((a, b) => a.id - b.id);

  let modeTitle = week.title;
  if (mode === "mistakes") modeTitle = `${week.title} — 错题专项加练`;
  if (mode === "due") modeTitle = `${week.title} — 记忆曲线练习`;

  return {
    weekNumber: week.number,
    title: modeTitle,
    words: words,
    language: week.language,
    mode: mode || "all",
  };
}

export default async function PracticePage({
  params,
  searchParams,
}: {
  params: Promise<{ weekId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { weekId } = await params;
  const resolvedSearchParams = await searchParams;
  const id = parseInt(weekId, 10);

  if (isNaN(id)) {
    notFound();
  }

  const mode = (resolvedSearchParams.mode as string) || "all";
  const data = await getWeekWords(id, mode);

  if (!data) {
    notFound();
  }

  const lang = (resolvedSearchParams.lang as string) || data.language;

  // 如果筛选后词数为 0 (比如选了错题加练但没有错题)
  if (data.words.length === 0) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs">
          {mode === "mistakes" ? (
            <Brain className="w-8 h-8" />
          ) : mode === "due" ? (
            <Clock className="w-8 h-8" />
          ) : (
            <Sparkles className="w-8 h-8" />
          )}
        </div>
        <h1 className="text-xl font-bold mb-2">
          {mode === "mistakes"
            ? "太棒了！当前词库没有待加练的错词"
            : mode === "due"
            ? "赞！当前词库暂无记忆曲线到期词"
            : "当前词库暂无练习词语"}
        </h1>
        <p className="text-gray-500 text-xs mb-6">
          {mode === "mistakes"
            ? "你已经完全掌握了该词库中的单词，没有错词记录！"
            : "所有单词复习进度良好，可开启全量听写练习。"}
        </p>

        <div className="space-y-3 w-full">
          <Link
            href={`/practice/${id}?lang=${lang}&mode=all`}
            className="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition"
          >
            开启全量听写/拼写练习 →
          </Link>
          <Link
            href="/"
            className="block w-full py-2.5 bg-white border border-amber-200 text-gray-700 rounded-xl font-medium text-xs hover:bg-amber-50 transition"
          >
            返回主页面板
          </Link>
        </div>
      </div>
    );
  }

  if (lang === "en") {
    return (
      <SpellingPractice
        weekId={id}
        weekNumber={data.weekNumber}
        title={data.title}
        words={data.words}
      />
    );
  }

  return (
    <PracticeSession
      weekId={id}
      weekNumber={data.weekNumber}
      title={data.title}
      words={data.words}
      language={data.language}
    />
  );
}
