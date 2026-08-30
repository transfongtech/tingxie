export interface ReviewRequestBody {
  mode?: "submission" | "preview";
  submissionId?: unknown;
  essayText?: unknown;
  promptTitle?: unknown;
}

export interface AuthoritativeSubmission {
  id: number;
  essayText: string;
  prompt: {
    title: string;
    description: string | null;
    images: Array<{ imagePath: string }>;
  } | null;
}

export interface ResolvedReviewInput {
  mode: "submission" | "preview";
  submissionId?: number;
  essayText: string;
  promptTitle?: string;
  promptDescription?: string;
  imagePaths: string[];
}

export type ReviewFailureRecorder = (
  submissionId: number,
  failureCode: string,
) => Promise<void>;

export class ReviewRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ReviewRequestError";
  }
}

type SubmissionLoader = (id: number) => Promise<AuthoritativeSubmission | null>;

function validatedEssayText(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 5) {
    throw new ReviewRequestError(
      400,
      "ESSAY_TEXT_INVALID",
      "Composition content is too short or missing.",
    );
  }
  return value.trim();
}

export async function resolveReviewInput(
  body: ReviewRequestBody,
  loadSubmission: SubmissionLoader,
): Promise<ResolvedReviewInput> {
  if (body.mode === "preview") {
    return {
      mode: "preview",
      essayText: validatedEssayText(body.essayText),
      promptTitle:
        typeof body.promptTitle === "string" ? body.promptTitle.trim() : undefined,
      imagePaths: [],
    };
  }

  if (
    typeof body.submissionId !== "number" ||
    !Number.isInteger(body.submissionId) ||
    body.submissionId <= 0
  ) {
    throw new ReviewRequestError(
      400,
      "SUBMISSION_ID_REQUIRED",
      "A valid submissionId is required for submission review.",
    );
  }

  const submission = await loadSubmission(body.submissionId);
  if (!submission || !submission.prompt) {
    throw new ReviewRequestError(
      404,
      "SUBMISSION_NOT_FOUND",
      "Submission or its prompt was not found.",
    );
  }

  const essayText = validatedEssayText(submission.essayText);
  if (
    body.essayText !== undefined &&
    (typeof body.essayText !== "string" ||
      body.essayText.trim() !== essayText)
  ) {
    throw new ReviewRequestError(
      409,
      "SUBMISSION_MISMATCH",
      "Request composition does not match the stored submission.",
    );
  }
  if (
    body.promptTitle !== undefined &&
    (typeof body.promptTitle !== "string" ||
      body.promptTitle.trim() !== submission.prompt.title.trim())
  ) {
    throw new ReviewRequestError(
      409,
      "SUBMISSION_MISMATCH",
      "Request prompt does not match the stored submission.",
    );
  }

  return {
    mode: "submission",
    submissionId: submission.id,
    essayText,
    promptTitle: submission.prompt.title,
    promptDescription: submission.prompt.description ?? undefined,
    imagePaths: submission.prompt.images.map(({ imagePath }) => imagePath),
  };
}
