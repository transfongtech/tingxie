import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const week1 = await prisma.week.findFirst({
            where: { number: 1 },
            include: {
                wordLists: {
                    include: {
                        word: true
                    }
                }
            }
        });

        if (!week1) {
            return NextResponse.json({ error: "Week 1 not found" });
        }

        const words = week1.wordLists.map(wl => ({
            id: wl.word.id,
            content: wl.word.content,
            wordId: wl.wordId
        }));

        // Analyze for duplicates within this week
        const contentMap = new Map<string, number>();
        words.forEach(w => {
            contentMap.set(w.content, (contentMap.get(w.content) || 0) + 1);
        });

        const duplicates = [];
        for (const [key, count] of contentMap.entries()) {
            if (count > 1) {
                duplicates.push({ content: key, count });
            }
        }

        return NextResponse.json({
            weekId: week1.id,
            totalWords: words.length,
            duplicates,
            allWords: words // List all to visually inspect if needed
        });

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
