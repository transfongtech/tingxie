import { createHash } from "node:crypto";

import type { EssayReviewResult } from "../essay-types";
import {
  ENGINE_VERSION,
  ESSAY_REVIEW_PROVIDER,
  EssayReviewProviderError,
  EssayReviewQualityError,
  PROMPT_VERSION,
  REVIEW_MODEL,
  type ImageInput,
} from "../essay-review";
import type {
  ReviewPersistenceMetadata,
  TerminalReviewFailure,
} from "../essay-feedback-persistence";
import { EssayReviewAlreadyInProgressError } from "../essay-feedback-persistence";
import { DEFAULT_ESSAY_RUBRIC } from "./rubric-rules";
import type { ResolvedReviewInput } from "./review-request";

type CompleteReview = EssayReviewResult & {
  qualityMetadata?: {
    engineVersion?: string;
    promptVersion?: string;
    model?: string;
    attempt?: number;
    [key: string]: unknown;
  };
};

export interface EssayReviewPipelineDependencies {
  review(
    essayText: string,
    promptTitle: string | undefined,
    promptDescription: string | undefined,
    images: ImageInput[],
  ): Promise<CompleteReview>;
  begin(submissionId: number): Promise<unknown>;
  saveSuccess(
    submissionId: number,
    review: CompleteReview,
    metadata: ReviewPersistenceMetadata,
  ): Promise<unknown>;
  saveFailure(
    submissionId: number,
    failure: TerminalReviewFailure,
    metadata: ReviewPersistenceMetadata,
  ): Promise<unknown>;
}

export class EssayReviewPersistenceError extends Error {
  readonly code = "REVIEW_STORAGE_FAILED";

  constructor(
    readonly phase: "begin" | "success" | "failure",
    cause: unknown,
  ) {
    super("Essay review persistence failed.", { cause });
    this.name = "EssayReviewPersistenceError";
  }
}

export function fingerprintReviewInput(input: ResolvedReviewInput): string {
  const canonical = JSON.stringify({
    essayText: input.essayText,
    promptTitle: input.promptTitle ?? null,
    promptDescription: input.promptDescription ?? null,
    imagePaths: input.imagePaths,
  });
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

function baseMetadata(
  inputFingerprint: string,
  attemptCount = 1,
): ReviewPersistenceMetadata {
  return {
    engineVersion: ENGINE_VERSION,
    promptVersion: PROMPT_VERSION,
    rubricVersion: DEFAULT_ESSAY_RUBRIC.version,
    provider: ESSAY_REVIEW_PROVIDER,
    model: REVIEW_MODEL,
    attemptCount,
    inputFingerprint,
  };
}

function failureDetails(error: unknown): {
  failure: TerminalReviewFailure;
  attempts: number;
  qualityMetadata?: unknown;
} {
  if (error instanceof EssayReviewQualityError) {
    return {
      failure: { code: error.code, message: error.message },
      attempts: error.attempts,
      qualityMetadata: { findings: error.findings },
    };
  }
  if (error instanceof EssayReviewProviderError) {
    return {
      failure: { code: error.code, message: error.message },
      attempts: 1,
    };
  }
  return {
    failure: {
      code: "REVIEW_INTERNAL_ERROR",
      message: error instanceof Error ? error.message : "Unexpected review failure.",
    },
    attempts: 1,
  };
}

export async function executeEssayReviewPipeline(
  input: ResolvedReviewInput,
  images: ImageInput[],
  dependencies: EssayReviewPipelineDependencies,
): Promise<CompleteReview> {
  if (input.mode === "preview") {
    return dependencies.review(
      input.essayText,
      input.promptTitle,
      input.promptDescription,
      images,
    );
  }

  const submissionId = input.submissionId;
  if (submissionId === undefined) {
    throw new Error("Submission review input is missing its submission id.");
  }
  const inputFingerprint = fingerprintReviewInput(input);
  let reviewLeaseId: string | undefined;

  try {
    const lease = await dependencies.begin(submissionId);
    if (
      lease &&
      typeof lease === "object" &&
      "leaseId" in lease &&
      typeof lease.leaseId === "string"
    ) {
      reviewLeaseId = lease.leaseId;
    }
  } catch (error) {
    if (error instanceof EssayReviewAlreadyInProgressError) throw error;
    throw new EssayReviewPersistenceError("begin", error);
  }

  let review: CompleteReview;
  try {
    review = await dependencies.review(
      input.essayText,
      input.promptTitle,
      input.promptDescription,
      images,
    );
  } catch (error) {
    const details = failureDetails(error);
    try {
      await dependencies.saveFailure(submissionId, details.failure, {
        ...baseMetadata(inputFingerprint, details.attempts),
        ...(reviewLeaseId ? { reviewLeaseId } : {}),
        qualityMetadata: details.qualityMetadata,
      });
    } catch (persistenceError) {
      throw new EssayReviewPersistenceError("failure", persistenceError);
    }
    throw error;
  }

  const quality = review.qualityMetadata;
  try {
    await dependencies.saveSuccess(submissionId, review, {
      ...baseMetadata(inputFingerprint, quality?.attempt),
      ...(reviewLeaseId ? { reviewLeaseId } : {}),
      engineVersion: quality?.engineVersion ?? ENGINE_VERSION,
      promptVersion: quality?.promptVersion ?? PROMPT_VERSION,
      model: quality?.model ?? REVIEW_MODEL,
      qualityMetadata: quality,
    });
  } catch (error) {
    try {
      await dependencies.saveFailure(
        submissionId,
        {
          code: "REVIEW_STORAGE_FAILED",
          message: "The accepted review could not be persisted.",
        },
        {
          ...baseMetadata(inputFingerprint, quality?.attempt),
          ...(reviewLeaseId ? { reviewLeaseId } : {}),
          qualityMetadata: quality,
        },
      );
    } catch (failureError) {
      throw new EssayReviewPersistenceError("failure", failureError);
    }
    throw new EssayReviewPersistenceError("success", error);
  }

  return review;
}
