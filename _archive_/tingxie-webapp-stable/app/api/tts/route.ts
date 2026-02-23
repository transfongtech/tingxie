import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import crypto from "crypto";

const execAsync = util.promisify(exec);

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text) {
        return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    try {
        // Voice selection
        const lang = searchParams.get("lang") || "zh";
        let voice = "zh-CN-XiaoxiaoNeural";
        if (lang === "en") {
            voice = "en-US-AriaNeural";
        }

        // Cache key based on text AND voice
        const hash = crypto.createHash("md5").update(text + voice).digest("hex");
        const audioDir = path.join(process.cwd(), "public", "tts_cache");
        const audioPath = path.join(audioDir, `${hash}.mp3`);

        // Ensure cache dir exists
        if (!fs.existsSync(audioDir)) {
            fs.mkdirSync(audioDir, { recursive: true });
        }

        // Generate if not cached
        if (!fs.existsSync(audioPath)) {
            const pythonPath = "/Users/tianluhuang/Library/CloudStorage/OneDrive-TransfongVentures/Documents/Downloads/Antigravity/economist-insight/.venv/bin/python3";
            const command = `"${pythonPath}" -m edge_tts --voice ${voice} --text "${text}" --write-media "${audioPath}"`;
            console.log("Executing TTS command:", command);
            await execAsync(command);
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
