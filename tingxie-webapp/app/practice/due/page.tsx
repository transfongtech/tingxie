import { prisma } from "@/lib/prisma";
import { pinyin } from "pinyin-pro";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";
import Link from "next/link";
import DueClient from "./DueClient";

async function getDueWords(lang: Language) {
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

  const progressRecords = await prisma.learningProgress.findMany({
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
    include: {
      word: true,
    },
  });

  const upcomingWeeks = await prisma.week.findMany({
    where: {
      language: lang,
      dictationDate: {
        gte: now,
        lte: nextWeek,
      },
    },
    include: {
      wordLists: {
        include: {
          word: true,
        },
      },
    },
  });

  const wordMap = new Map<number, { id: number; content: string }>();

  progressRecords.forEach((p) => {
    wordMap.set(p.word.id, p.word);
  });

  upcomingWeeks.forEach((week) => {
    week.wordLists.forEach((wl) => {
      wordMap.set(wl.word.id, wl.word);
    });
  });

  if (wordMap.size === 0) return null;

  const words = Array.from(wordMap.values()).map((w) => {
    const content = w.content;
    const py = content.length <= 8 ? pinyin(content) : null;
    return {
      id: w.id,
      content: content,
      pinyin: py,
    };
  });

  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  return {
    words: words,
  };
}

export const dynamic = "force-dynamic";

export default async function DuePage() {
  const cookieStore = await cookies();
  const lang =
    (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;

  const data = await getDueWords(lang);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#FBF7F0] text-[#2D2D2D]">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🎉</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">今天没有待复习的词语！</h1>
        <p className="text-gray-500 mb-8 max-w-sm">
          {lang === "zh"
            ? "太棒了，你已经完成了所有到期的华文词语复习。"
            : "Awesome! You have finished all due English words for today."}
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          返回主页面板 →
        </Link>
      </div>
    );
  }

  return <DueClient words={data.words} language={lang} />;
}
