import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

import {
  beginEssayReview,
  EssayReviewAlreadyInProgressError,
  saveSuccessfulEssayFeedback,
  saveTerminalEssayReviewFailure,
} from "@/lib/essay-feedback-persistence";
import {
  EssayReviewProviderError,
  EssayReviewQualityError,
  type ImageInput,
  reviewEssayWithAI,
} from "@/lib/essay-review";
import {
  resolveReviewInput,
  ReviewRequestError,
  type ReviewRequestBody,
} from "@/lib/essay-review/review-request";
import {
  EssayReviewPersistenceError,
  executeEssayReviewPipeline,
} from "@/lib/essay-review/review-pipeline";
import prisma from "@/lib/prisma";
import { reviewAlreadyRunningResponse } from "@/lib/review-regrade-response";
import { requireFamilySession } from "@/lib/family-session";

function resolveImageBuffer(imagePath: string): ImageInput {
  const publicRoot = path.resolve(process.cwd(), "public");
  const cleanPath = imagePath.trim().replace(/^\/+/, "").replace(/^public\//, "");
  const fullPath = path.resolve(publicRoot, cleanPath);
  if (!fullPath.startsWith(`${publicRoot}${path.sep}`) || !fs.existsSync(fullPath)) {
    throw new ReviewRequestError(
      422,
      "PROMPT_IMAGE_UNAVAILABLE",
      "A stored prompt image is unavailable.",
    );
  }

  const mimeTypes: Record<string, string> = {
    ".gif": "image/gif",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  return {
    buffer: fs.readFileSync(fullPath),
    mimeType: mimeTypes[path.extname(fullPath).toLowerCase()] ?? "image/jpeg",
  };
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json()) as ReviewRequestBody;
    const input = await resolveReviewInput(body, (id) =>
      prisma.essaySubmission.findUnique({
        where: { id },
        select: {
          id: true,
          essayText: true,
          prompt: {
            select: {
              title: true,
              description: true,
              images: {
                orderBy: { sortOrder: "asc" },
                select: { imagePath: true },
              },
            },
          },
        },
      }),
    );
    const images = input.imagePaths.map(resolveImageBuffer);
    const reviewResult = await executeEssayReviewPipeline(input, images, {
      review: reviewEssayWithAI,
      begin: (submissionId) => beginEssayReview(submissionId, prisma),
      saveSuccess: (submissionId, review, metadata) =>
        saveSuccessfulEssayFeedback(submissionId, review, metadata, prisma),
      saveFailure: (submissionId, failure, metadata) =>
        saveTerminalEssayReviewFailure(submissionId, failure, metadata, prisma),
    });

    return NextResponse.json({ success: true, data: reviewResult });
  } catch (error) {
    if (error instanceof EssayReviewAlreadyInProgressError) {
      return reviewAlreadyRunningResponse();
    }
    if (error instanceof ReviewRequestError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    if (error instanceof EssayReviewQualityError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          attempts: error.attempts,
          findings: error.findings,
        },
        { status: 422 },
      );
    }
    if (error instanceof EssayReviewProviderError) {
      console.error("Essay review provider error.", error.cause);
      return NextResponse.json(
        { success: false, code: error.code },
        { status: 502 },
      );
    }
    if (error instanceof EssayReviewPersistenceError) {
      console.error(`Essay review persistence failed during ${error.phase}.`, error.cause);
      return NextResponse.json(
        { success: false, code: error.code, phase: error.phase },
        { status: 500 },
      );
    }

    console.error("Unexpected essay review error.", error);
    return NextResponse.json(
      { success: false, code: "REVIEW_INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
