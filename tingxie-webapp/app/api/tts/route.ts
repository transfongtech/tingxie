import { NextRequest } from "next/server";

import { createTtsHandlers } from "@/lib/tts-handler";

const handlers = createTtsHandlers();

export function GET(request: NextRequest) {
  return handlers.GET(request);
}

export function POST(request: NextRequest) {
  return handlers.POST(request);
}
