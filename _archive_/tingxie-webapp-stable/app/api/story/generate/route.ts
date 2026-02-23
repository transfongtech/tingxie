import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const { words } = await req.json();

        if (!words || !Array.isArray(words) || words.length === 0) {
            return NextResponse.json({ error: "Missing words" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Missing API Key" }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
        Create a short, funny, and creative story in Chinese (Simplified) using the following vocabulary words:
        ${words.join(", ")}

        Requirements:
        1. The story should be coherent and interesting for a primary school student.
        2. Keep it relatively short (under 150 words).
        3. IMPORTANT: When you use one of the provided vocabulary words, write it in this format: Word(pinyin). For example: 忍不住(rěn bú zhù).
        4. Do NOT translate the story into English.
        5. Only return the story text, no other commentary.
        `;

        const result = await model.generateContent(prompt);
        const story = result.response.text();

        return NextResponse.json({ story });
    } catch (error) {
        console.error("Story generation failed:", error);
        return NextResponse.json({ error: "Story generation failed" }, { status: 500 });
    }
}
