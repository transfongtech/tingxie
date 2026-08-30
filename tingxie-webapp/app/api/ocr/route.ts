import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
    }

    if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      return NextResponse.json({ error: "未设置 API 环境变量" }, { status: 500 });
    }

    const buffer = await file.arrayBuffer();
    const base64Data = Buffer.from(buffer).toString("base64");
    const mimeType = file.type || "image/jpeg";

    const prompt = `Extract all vocabulary words from this image of a Chinese or English spelling list.

Return ONLY a valid JSON array of strings containing the words found.
Example: ["description", "equipment", "freezer"] or ["看新闻", "国内外"]

Rules:
- Include only vocabulary words, ignoring page numbers or headers`;

    const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
            { 
                role: "user", 
                parts: [
                    { text: prompt }, 
                    { inlineData: { data: base64Data, mimeType } }
                ] 
            }
        ],
        config: { responseMimeType: "application/json" }
    });

    const text = response.text || "[]";
    const words = JSON.parse(text);

    return NextResponse.json({ success: true, words });
  } catch (error: any) {
    console.error("OCR API error:", error);
    return NextResponse.json(
      { error: "无法识别图片中的词汇，请确认图片清晰" },
      { status: 500 }
    );
  }
}
