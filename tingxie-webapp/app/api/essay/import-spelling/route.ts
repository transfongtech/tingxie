import { NextRequest, NextResponse } from "next/server";
import { importSpellingErrors } from "@/app/actions/essay";
import {
  parseSpellingImportRequest,
  type SpellingImportResult,
} from "@/lib/spelling-import";
import { requireFamilySession } from "@/lib/family-session";

function statusFor(result: SpellingImportResult): number {
  if (result.outcome === "success") return 200;
  if (result.outcome === "partial") return 207;
  return result.failed > 0 ? 500 : 422;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireFamilySession(req);
  if (unauthorized) return unauthorized;

  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    console.warn("Invalid JSON sent to import-spelling API:", error);
    return NextResponse.json({ success: false, error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = parseSpellingImportRequest(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });
  }

  try {
    const result = await importSpellingErrors(parsed.spellingErrors);
    return NextResponse.json(result, { status: statusFor(result) });
  } catch (error) {
    console.error("Unexpected import-spelling API failure:", error);
    return NextResponse.json(
      {
        success: false,
        outcome: "failure",
        imported: 0,
        duplicates: 0,
        rejected: 0,
        failed: parsed.spellingErrors.length,
        items: [],
        error: "Failed to import spelling errors",
      } satisfies SpellingImportResult,
      { status: 500 },
    );
  }
}
