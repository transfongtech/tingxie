import { NextRequest, NextResponse } from "next/server";
import { getGeminiClient } from "@/lib/gemini";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { requireFamilySession } from "@/lib/family-session";
import {
  ALLOWED_PROMPT_IMAGE_TYPES,
  createPromptImageFilename,
  MAX_PROMPT_IMAGE_BYTES,
  parsePromptImageId,
  resolvePromptImagePath,
} from "@/lib/prompt-image-storage";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function ensureRealDirectory(directory: string, parent: string): Promise<boolean> {
  if ((await fs.realpath(parent)) !== parent) return false;
  try {
    await fs.mkdir(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const stats = await fs.lstat(directory);
  return stats.isDirectory() && !stats.isSymbolicLink() && (await fs.realpath(directory)) === directory;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  try {
    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const file = fileEntry instanceof File ? fileEntry : null;
    const promptId = parsePromptImageId(formData.get("promptId"));

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }
    if (!promptId) {
      return NextResponse.json({ error: "Invalid prompt identifier" }, { status: 400 });
    }
    if (!ALLOWED_PROMPT_IMAGE_TYPES.has(file.type) || file.size < 1 || file.size > MAX_PROMPT_IMAGE_BYTES) {
      return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
    }

    const filename = createPromptImageFilename();
    const uploadRoot = path.resolve(process.cwd(), "public", "essay_prompts");
    const destination = resolvePromptImagePath(uploadRoot, promptId, filename);
    if (!destination) {
      return NextResponse.json({ error: "Invalid upload destination" }, { status: 400 });
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());
    let processedBuffer: Buffer;
    try {
      const sharpOptions = {
        failOn: "error",
        limitInputPixels: 40_000_000,
      } as const;
      const inputMetadata = await sharp(rawBuffer, sharpOptions).metadata();
      if (
        !inputMetadata.width ||
        !inputMetadata.height ||
        !["jpeg", "png", "webp"].includes(inputMetadata.format ?? "")
      ) {
        throw new Error("Input image is invalid");
      }
      processedBuffer = await sharp(rawBuffer, sharpOptions)
        .rotate()
        .normalize({ lower: 8, upper: 95 })
        .sharpen({ sigma: 1.2 })
        .jpeg({ quality: 90 })
        .toBuffer();
      const metadata = await sharp(processedBuffer).metadata();
      if (metadata.format !== "jpeg" || !metadata.width || !metadata.height) {
        throw new Error("Processed image is invalid");
      }
    } catch {
      return NextResponse.json({ error: "Invalid or unsupported image file" }, { status: 400 });
    }

    const publicRoot = path.dirname(uploadRoot);
    if (
      !(await ensureRealDirectory(uploadRoot, publicRoot)) ||
      !(await ensureRealDirectory(destination.directory, uploadRoot))
    ) {
      return NextResponse.json({ error: "Invalid upload destination" }, { status: 400 });
    }
    await fs.writeFile(destination.filePath, processedBuffer, { flag: "wx" });

    const relativePath = `/essay_prompts/${promptId}/${filename}`;

    const isReadable = true;
    let contentDescription = "Picture prompt uploaded";

    // 如果配置了 Gemini Key，用 Vision 进行短分析
    if (apiKey) {
      try {
        const response = await getGeminiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                {
                    role: "user",
                    parts: [
                        { text: "Analyze this photo of an English composition picture prompt. Describe what you see in 1-2 concise sentences." },
                        { inlineData: { data: processedBuffer.toString("base64"), mimeType: "image/jpeg" } }
                    ]
                }
            ]
        });

        const text = response.text;
        if (text) {
          contentDescription = text.trim();
        }
      } catch (aiErr) {
        console.warn("Gemini vision analysis skipped:", aiErr);
      }
    }

    return NextResponse.json({
      success: true,
      imagePath: relativePath,
      contentDescription,
      isReadable,
    });
  } catch (error) {
    console.error("Error uploading prompt image:", error);
    return NextResponse.json({ error: "Failed to process image upload" }, { status: 500 });
  }
}
