
import { NextRequest, NextResponse } from "next/server";
import { recognizeHandwriting } from "@/lib/handwriting";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image } = body;

        if (!image) {
            return NextResponse.json({ error: "Image data is required" }, { status: 400 });
        }

        const text = await recognizeHandwriting(image);

        // Basic cleaning of the result (trimming)
        const cleanedText = text.trim();

        return NextResponse.json({ text: cleanedText });
    } catch (error: any) {
        console.error("Handwriting recognition error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to recognize handwriting" },
            { status: 500 }
        );
    }
}
