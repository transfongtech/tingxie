import MistakesClient from "./MistakesClient";
import { prisma } from "@/lib/prisma";
import { pinyin } from "pinyin-pro";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";
import Link from "next/link";

async function getMistakes(lang: Language) {
  const progressRecords = await prisma.learningProgress.findMany({
    where: {
      stage: 0,
      lastReviewDate: {
        not: null,
      },
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
    include: {
      word: true,
    },
    orderBy: {
      lastReviewDate: "desc",
    },
  });

  if (!progressRecords || progressRecords.length === 0) return null;

  const words = progressRecords.map((p) => {
    const content = p.word.content;
    const py = content.length <= 8 ? pinyin(content) : null;
    return {
      id: p.word.id,
      content: content,
      pinyin: py,
    };
  });

  return {
    words: words,
  };
}

export const dynamic = "force-dynamic";

export default async function MistakesPage() {
  const cookieStore = await cookies();
  const lang =
    (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;

  const data = await getMistakes(lang);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-[#FBF7F0] text-[#2D2D2D]">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🌟</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">没有错题记录！</h1>
        <p className="text-gray-500 mb-8 max-w-sm">
          {lang === "zh"
            ? "你目前没有需要专项巩固的华文错题。"
            : "No English mistakes found for review."}
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

  return <MistakesClient words={data.words} language={lang} />;
}
