import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const result: any = {};

        // 1. Check for Cross-Week Duplicates
        // Meaning the same `wordId` is linked to multiple `weekId`
        const wordLists = await prisma.wordList.findMany({
            include: {
                word: true,
                week: true
            }
        });

        const wordWeekMap = new Map<string, number[]>();
        for (const wl of wordLists) {
            const word = wl.word.content;
            if (!wordWeekMap.has(word)) {
                wordWeekMap.set(word, []);
            }
            wordWeekMap.get(word)?.push(wl.week.number);
        }

        const crossWeekDuplicates: any[] = [];
        for (const [word, weeks] of wordWeekMap.entries()) {
            if (weeks.length > 1) {
                crossWeekDuplicates.push({ word, weeks });
            }
        }
        result.crossWeekDuplicates = crossWeekDuplicates;


        // 2. Check for Substring Duplicates in Week 1
        const week1 = await prisma.week.findFirst({
            where: { number: 1 },
            include: { wordLists: { include: { word: true } } }
        });

        if (week1) {
            const words = week1.wordLists.map(wl => wl.word.content);
            const substringDupes = [];

            for (let i = 0; i < words.length; i++) {
                for (let j = 0; j < words.length; j++) {
                    if (i === j) continue;
                    if (words[j].includes(words[i])) {
                        substringDupes.push({
                            short: words[i],
                            long: words[j]
                        });
                    }
                }
            }
            result.week1SubstringDuplicates = substringDupes;
        }

        return NextResponse.json(result);

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
