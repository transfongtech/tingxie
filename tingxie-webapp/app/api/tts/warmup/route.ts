import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const weekNumberStr = formData.get("weekNumber");
        const language = formData.get("language");

        if (!weekNumberStr || !language) {
            return NextResponse.json({ error: "Missing required fields: weekNumber, language" }, { status: 400 });
        }

        const weekNumber = parseInt(weekNumberStr.toString(), 10);
        const lang = language.toString();

        console.log(`[WebMCP] Agent requested TTS warmup for week ${weekNumber}, lang ${lang}`);

        // Find the week
        const week = await prisma.week.findFirst({
            where: {
                number: weekNumber,
                language: lang
            },
            include: {
                wordLists: {
                    include: {
                        word: true
                    }
                }
            }
        });

        if (!week) {
            console.warn(`[WebMCP] Week ${weekNumber} for language ${lang} not found`);
            return NextResponse.json({ error: `Week ${weekNumber} for language ${lang} not found` }, { status: 404 });
        }

        const wordsToWarmup = week.wordLists.map(wl => wl.word.content);

        console.log(`[WebMCP] Found ${wordsToWarmup.length} words to warm up.`);

        // Call the local TTS API for each word to trigger caching
        const baseUrl = req.nextUrl.origin;
        let successCount = 0;

        for (const text of wordsToWarmup) {
            try {
                // By calling our own GET endpoint, we trigger the cache logic in route.ts
                const ttsUrl = `${baseUrl}/api/tts?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(lang)}`;
                const response = await fetch(ttsUrl);
                if (response.ok) {
                    successCount++;
                } else {
                    console.error(`[WebMCP] Failed to warmup TTS for word: ${text}. Status: ${response.status}`);
                }
            } catch (err) {
                console.error(`[WebMCP] Error requesting TTS for word: ${text}`, err);
            }
        }

        console.log(`[WebMCP] Successfully warmed up ${successCount}/${wordsToWarmup.length} words.`);

        return NextResponse.json({
            status: "success",
            message: `Warmed up TTS for ${successCount} words in week ${weekNumber}.`
        });

    } catch (error: any) {
        console.error("[WebMCP] Error in TTS warmup:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
