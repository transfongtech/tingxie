import { NextRequest, NextResponse } from "next/server";
import { convertPdfToImages } from "@/scripts/test_pdf_ocr";
import { getGeminiClient } from "@/lib/gemini";
import { importStructuredUnits } from "@/app/actions/import";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const grade = parseInt((formData.get("grade") as string) || "4");
    const term = parseInt((formData.get("term") as string) || "2");
    const language = (formData.get("language") as string) || "zh";

    if (!file) {
      return NextResponse.json({ success: false, error: "No PDF file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Convert PDF pages to PNG base64 strings using pdfium helper
    const pagesB64 = await convertPdfToImages(buffer);

    // 2. Call Gemini Vision
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "Server missing API KEY" }, { status: 500 });
    }

    const imageParts = pagesB64.map((b64Str: string) => ({
      inlineData: {
        data: b64Str,
        mimeType: "image/png",
      },
    }));

    const prompt = `
你是一个专业的中文/英文小学教材与听写试卷识别专家。
请仔细分析上传的这几张听写默写表/词汇表图片。

请提取图片中所有的【听写】与【默写】单元（Units / Weeks / 听写项目），并输出标准的 JSON 数组。

规则要求：
1. 提取每一个听写或默写的编号 (number) 和完整标题 (title)。例如：
   - "听写（十）《这样才对》" => number: 10, title: "听写（十）《这样才对》"
   - "默写（八）" => number: 108, title: "默写（八）" (默写编号用 100 + 括号数字以防与听写冲突)
2. 提取该分组下的所有条目 (items):
   - 对于听写：所有词语/短语（去除拼音）
   - 对于默写：所有完整的句子/段落（包含标点符号，去除拼音）
3. grade 填 ${grade}，term 填 ${term}，language 填 "${language}"。

输出纯 JSON 数组，格式如下：
[
  {
    "number": 10,
    "title": "听写（十）《这样才对》",
    "grade": ${grade},
    "term": ${term},
    "language": "${language}",
    "items": ["词语1", "词语2"]
  }
]
`;

    const response = await getGeminiClient().models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
            {
                role: "user",
                parts: [
                    { text: prompt },
                    ...imageParts
                ]
            }
        ],
        config: { responseMimeType: "application/json" }
    });
    
    const responseText = response.text || "[]";
    const parsedUnits = JSON.parse(responseText);

    // 3. Save into DB
    const importRes = await importStructuredUnits(parsedUnits);

    return NextResponse.json({
      success: true,
      unitsCount: parsedUnits.length,
      itemCount: importRes.count,
      data: parsedUnits,
    });
  } catch (error: any) {
    console.error("PDF Import API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process PDF" },
      { status: 500 }
    );
  }
}
