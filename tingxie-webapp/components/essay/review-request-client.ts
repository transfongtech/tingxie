export class ReviewRequestFailure extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ReviewRequestFailure";
  }
}

type ReviewResponseBody = {
  success?: boolean;
  data?: unknown;
  code?: string;
  error?: string;
};

function failureMessage(status: number, body: ReviewResponseBody): string {
  if (status === 401) {
    return "Your family session has expired. Please sign in again, then retry the review.";
  }
  if (body.error) return body.error;
  if (status === 409) return "A review is already running. Please wait, then try again.";
  if (body.code === "REVIEW_QUALITY_FAILED") {
    return "The review did not pass our quality checks. Your composition is safe; please retry.";
  }
  if (body.code === "REVIEW_PROVIDER_FAILED") {
    return "The AI review service is temporarily unavailable. Your composition is safe; please retry.";
  }
  if (body.code === "REVIEW_STORAGE_FAILED") {
    return "The review could not be saved. No previous review was replaced; please retry.";
  }
  return "The review could not be completed. Your composition is safe; please retry.";
}

export async function requestPersistedEssayReview(
  submissionId: number,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  let response: Response;
  try {
    response = await fetcher("/api/essay/review", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
  } catch (error) {
    console.error("Essay review request could not reach the server.", error);
    throw new ReviewRequestFailure(
      "The review service could not be reached. Your composition is safe; please retry.",
      0,
    );
  }

  let body: ReviewResponseBody = {};
  const rawBody = await response.text();
  if (rawBody) {
    try {
      body = JSON.parse(rawBody) as ReviewResponseBody;
    } catch (error) {
      console.error("Essay review returned an invalid response body.", error);
    }
  }

  // The official endpoint only reports success after the current feedback is saved.
  if (!response.ok || body.success !== true || body.data == null) {
    throw new ReviewRequestFailure(
      failureMessage(response.status, body),
      response.status,
      body.code,
    );
  }
}
