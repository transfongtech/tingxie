import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
    try {
        const words = await prisma.word.findMany({
            select: { id: true, content: true }
        });

        const map = new Map<string, { id: number, original: string }[]>();
        const duplicates: any[] = [];

        for (const w of words) {
            // Fuzzy normalize: strip whitespace, punctuation, etc.
            const clean = w.content.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, "");

            if (map.has(clean)) {
                map.get(clean)?.push({ id: w.id, original: w.content });
            } else {
                map.set(clean, [{ id: w.id, original: w.content }]);
            }
        }

        // Filter for those with more than 1 ID
        for (const [key, items] of map.entries()) {
            if (items.length > 1) {
                duplicates.push({ normalized: key, items });
            }
        }

        return NextResponse.json({
            totalWords: words.length,
            duplicateCount: duplicates.length,
            duplicates
        });

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
