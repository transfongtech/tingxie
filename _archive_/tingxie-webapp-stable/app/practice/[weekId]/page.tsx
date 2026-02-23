import { PracticeSession } from "@/components/PracticeSession";
import { PrismaClient } from "@prisma/client";
import { notFound } from "next/navigation";

const prisma = new PrismaClient();

import { pinyin } from "pinyin-pro";

async function getWeekWords(weekId: number) {
    const week = await prisma.week.findUnique({
        where: { id: weekId }, // Use ID for uniqueness
        include: {
            wordLists: {
                include: {
                    word: true,
                },
            },
        },
    });

    if (!week) return null;

    const words = week.wordLists.map(wl => {
        const content = wl.word.content;
        const py = content.length <= 8 ? pinyin(content) : null;
        return {
            id: wl.word.id,
            content: content,
            pinyin: py,
        };
    });

    // No server-side shuffle. Let client handle it to avoid "shifting list" bugs on re-render.
    // Ideally sort by ID or content to ensure stability.
    words.sort((a, b) => a.id - b.id);

    return {
        weekNumber: week.number,
        words: words,
        language: week.language // Pass language to session
    };
}

// Next.js 15+ params/searchParams are promises
export default async function PracticePage({
    params,
    searchParams
}: {
    params: Promise<{ weekId: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { weekId } = await params;
    const id = parseInt(weekId);

    if (isNaN(id)) {
        notFound();
    }

    const data = await getWeekWords(id);

    if (!data) {
        notFound();
    }

    const resolvedSearchParams = await searchParams;
    const isHandwriting = resolvedSearchParams.mode === 'handwriting';

    return <PracticeSession
        weekNumber={data.weekNumber}
        words={data.words}
        language={data.language}
        handwritingMode={isHandwriting}
    />;
}
