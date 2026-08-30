import { NextResponse } from "next/server";

export function reviewAlreadyRunningResponse() {
  return NextResponse.json(
    {
      success: false,
      code: "REVIEW_ALREADY_IN_PROGRESS",
      error: "A review is already running. Please wait for it to finish.",
    },
    { status: 409 },
  );
}
