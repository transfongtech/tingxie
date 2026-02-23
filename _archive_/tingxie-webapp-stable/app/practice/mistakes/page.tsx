import MistakesClient from "./MistakesClient";
import { PrismaClient } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";

const prisma = new PrismaClient();

async function getMistakes(lang: Language) {
    // Filter mistakes by language via Week association
    const progressRecords = await prisma.learningProgress.findMany({
        where: {
            stage: 0,
            lastReviewDate: {
                not: null
            },
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
        include: {
            word: true
        },
        orderBy: {
            lastReviewDate: 'desc'
        }
    });

    if (!progressRecords || progressRecords.length === 0) return null;

    const words = progressRecords.map(p => {
        const content = p.word.content;
        const py = content.length <= 8 ? pinyin(content) : null;
        return {
            id: p.word.id,
            content: content,
            pinyin: py,
        };
    });

    // No server-side shuffle. Client handles it.
    // Ideally sort by review date or content stability.
    // words is already ordered by lastReviewDate desc from Prisma query.

    return {
        words: words
    };
}

export const dynamic = 'force-dynamic';

export default async function MistakesPage() {
    const cookieStore = await cookies();
    const lang = (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;

    const data = await getMistakes(lang);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">No Mistakes Found! 🎉</h1>
                <p className="text-slate-500 mb-8">
                    {lang === 'zh'
                        ? "You haven't made any mistakes in Chinese yet."
                        : "You haven't made any mistakes in English yet."}
                </p>
                <a href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                    Back to Dashboard
                </a>
            </div>
        )
    }

    return <MistakesClient words={data.words} language={lang} />;
}
