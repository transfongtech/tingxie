import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as googleTTS from "google-tts-api";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text) {
        return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    try {
        // Voice selection
        const lang = searchParams.get("lang") || "zh";
        let ttsLang = "zh-CN";
        if (lang === "en") {
            ttsLang = "en";
        }

        // Cache key based on text AND voice
        const hash = crypto.createHash("md5").update(text + ttsLang).digest("hex");
        const audioDir = path.join(process.cwd(), "public", "tts_cache");
        const audioPath = path.join(audioDir, `${hash}.mp3`);

        // Ensure cache dir exists
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }

        // Generate if not cached
        if (!fs.existsSync(audioPath)) {
            console.log(`Generating TTS base64 using google-tts-api for "${text}" (${ttsLang})`);
            const base64Audio = await googleTTS.getAudioBase64(text, {
                lang: ttsLang,
                slow: false,
                host: 'https://translate.google.com',
            });
            const buffer = Buffer.from(base64Audio, "base64");
            fs.writeFileSync(audioPath, buffer);
        }

        // Return audio file
        const fileBuffer = fs.readFileSync(audioPath);
        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "audio/mpeg",
                "Content-Length": fileBuffer.length.toString(),
                "Cache-Control": "public, max-age=31536000, immutable",
            },
        });

    } catch (error: any) {
        console.error("TTS generation failed:", error);
        return NextResponse.json({ error: "TTS generation failed" }, { status: 500 });
    }
}
