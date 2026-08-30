import { NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wrongWords = body.wrongWords || body.words; // 兼容两种 key
    const language = body.language || "zh";

    if (!wrongWords || !Array.isArray(wrongWords) || wrongWords.length === 0) {
      return NextResponse.json({ error: "Missing wrongWords array" }, { status: 400 });
    }

    if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
      const fallbackStory = language === "zh"
        ? `清宇今天练习了这些词语：${wrongWords.join("、")}。每一次练习都是进步，继续加油！`
        : `Today, George practiced ${wrongWords.join(", ")}. Every mistake is a step closer to mastering spelling!`;
      return NextResponse.json({ story: fallbackStory });
    }

    const prompt = language === "zh"
      ? `请为一个叫清宇的小学生（P4）写一个简短有趣的中文小故事（4-6句话），把下面这些他今天听写练习的词语都自然地用进去：

词语：${wrongWords.join("、")}

要求：
1. 全部用中文写作，不要出现任何英文。
2. 故事内容要积极、有趣、鼓励性的，适合小学四年级阅读。
3. 每个目标词语在文中用《》标记，例如：清宇《勇敢》地站了出来。
4. 如果词语中有生僻字或难字，在该字后面用括号加注拼音，例如：翱（áo）翔。
5. 不要加标题，直接写故事正文。`
      : `Create a short, fun, encouraging story (3-5 sentences) for a primary school student named George using these English words he needs to practise:

Words: ${wrongWords.join(", ")}

Requirements:
1. Use each word at least once in the story.
2. Mark each target word with 《word》 markers.
3. Keep the sentences simple, engaging, and easy to read.
4. Do NOT add a title, just write the story directly.`;

    const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    const text = response.text;

    return NextResponse.json({ story: text });
  } catch (error) {
    console.error("Story generation error:", error);
    return NextResponse.json(
      { error: "AI 故事生成失败，请稍后重试" },
      { status: 500 }
    );
  }
}
