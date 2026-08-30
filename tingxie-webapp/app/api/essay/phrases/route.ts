import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PHRASE_CATEGORIES,
  persistPhrases,
  type PhraseCategory,
  type PhraseDatabase,
} from "@/lib/phrase-persistence";
import { requireFamilySession } from "@/lib/family-session";

const SOURCES = ["ai", "preset", "manual"] as const;

export async function GET(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const source = searchParams.get("source");

  try {
    if (category && !PHRASE_CATEGORIES.includes(category as PhraseCategory)) {
      return NextResponse.json({ success: false, error: "Invalid phrase category" }, { status: 400 });
    }
    if (source && !SOURCES.includes(source as (typeof SOURCES)[number])) {
      return NextResponse.json({ success: false, error: "Invalid phrase source" }, { status: 400 });
    }
    const where: { language: string; category?: string; source?: string } = { language: "en" };
    if (category) where.category = category;
    if (source) where.source = source;

    const phrases = await prisma.phrase.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, phrases });
  } catch (error) {
    console.error("Failed to fetch phrases:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch phrases" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.warn("Invalid JSON sent to phrases API:", error);
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ success: false, error: "Request body must be an object" }, { status: 400 });
  }
  try {
    const record = body as Record<string, unknown>;
    const result = await persistPhrases(
      [{ phrase: record.content, category: record.category }],
      "manual",
      prisma as unknown as PhraseDatabase,
    );
    if (result.outcome === "failure") {
      const error = result.error ?? result.rejected[0]?.error ?? "Failed to create phrase";
      return NextResponse.json(
        { success: false, error, persistence: result },
        { status: result.error ? 500 : 422 },
      );
    }
    return NextResponse.json({
      success: true,
      phrase: result.saved[0],
      duplicate: result.duplicates > 0,
      persistence: result,
    });
  } catch (error) {
    console.error("Failed to create phrase:", error);
    return NextResponse.json({ success: false, error: "Failed to create phrase" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const idStr = searchParams.get("id");

  if (!idStr) {
    return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
  }

  try {
    if (!/^\d+$/.test(idStr)) {
      return NextResponse.json({ success: false, error: "ID must be a positive integer" }, { status: 400 });
    }
    const id = Number(idStr);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ success: false, error: "ID must be a positive integer" }, { status: 400 });
    }
    await prisma.phrase.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete phrase:", error);
    return NextResponse.json({ success: false, error: "Failed to delete phrase" }, { status: 500 });
  }
}
