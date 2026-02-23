import { PracticeSession } from "@/components/PracticeSession";
import { PrismaClient } from "@prisma/client";
import { pinyin } from "pinyin-pro";
import { cookies } from "next/headers";
import { LANGUAGE_COOKIE, DEFAULT_LANGUAGE, Language } from "@/lib/language";

const prisma = new PrismaClient();

async function getDueWords(lang: Language) {
    const now = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);

    // Language Filter
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

    // 1. Standard Due/Mistakes + Language Filter
    const progressRecords = await prisma.learningProgress.findMany({
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
        include: {
            word: true
        }
    });

    // 2. Upcoming Dictation Words (Priority) + Language Filter
    const upcomingWeeks = await prisma.week.findMany({
        where: {
            language: lang,
            dictationDate: {
                gte: now,
                lte: nextWeek
            }
        },
        include: {
            wordLists: {
                include: {
                    word: true
                }
            }
        }
    });

    // Collect all word IDs and objects
    const wordMap = new Map<number, { id: number, content: string }>();

    // Add progress-based due words
    progressRecords.forEach(p => {
        wordMap.set(p.word.id, p.word);
    });

    // Add upcoming dictation words
    upcomingWeeks.forEach(week => {
        week.wordLists.forEach(wl => {
            wordMap.set(wl.word.id, wl.word);
        });
    });

    if (wordMap.size === 0) return null;

    const words = Array.from(wordMap.values()).map(w => {
        const content = w.content;
        const py = content.length <= 8 ? pinyin(content) : null;
        return {
            id: w.id,
            content: content,
            pinyin: py,
        };
    });

    // Shuffle logic
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    return {
        words: words
    };
}

export const dynamic = 'force-dynamic';

export default async function DuePage() {
    const cookieStore = await cookies();
    const lang = (cookieStore.get(LANGUAGE_COOKIE)?.value as Language) || DEFAULT_LANGUAGE;

    const data = await getDueWords(lang);

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
                <h1 className="text-2xl font-bold mb-4">All Caught Up! 🎉</h1>
                <p className="text-slate-500 mb-8">
                    {lang === 'zh'
                        ? "You have no Chinese words due for review today."
                        : "You have no English words due for review today."}
                </p>
                <a href="/" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
                    Back to Dashboard
                </a>
            </div>
        )
    }

    // Reuse PracticeSession directly, pass language explicitly to ensure font/TTS is correct
    return <PracticeSession weekNumber={0} words={data.words} language={lang} />;
}
