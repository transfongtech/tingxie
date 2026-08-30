import type { ReviewQualityFinding } from "./quality-gate";

export interface EssayReviewImage {
  readonly data: Uint8Array;
  readonly mimeType: string;
}

export interface EssayReviewInput {
  readonly text: string;
  readonly prompt?: {
    readonly title?: string;
    readonly description?: string;
  };
  readonly images?: readonly EssayReviewImage[];
}

export interface EssayReviewProviderRequest {
  readonly prompt: string;
  readonly images: readonly EssayReviewImage[];
  readonly attempt: 1 | 2;
  readonly repairFindings: readonly ReviewQualityFinding[];
}

export interface EssayReviewProvider {
  readonly id: string;
  readonly model: string;
  generate(request: EssayReviewProviderRequest): Promise<unknown>;
}

export type EssayReviewErrorCode =
  | "REVIEW_INPUT_INVALID"
  | "REVIEW_RESPONSE_INVALID"
  | "REVIEW_PROVIDER_FAILED"
  | "REVIEW_QUALITY_FAILED";

export class EssayReviewInputError extends Error {
  readonly code = "REVIEW_INPUT_INVALID";

  constructor(message: string) {
    super(message);
    this.name = "EssayReviewInputError";
  }
}

export class EssayReviewProviderError extends Error {
  readonly code = "REVIEW_PROVIDER_FAILED";

  constructor(cause: unknown) {
    super("Essay review provider failed.", { cause });
    this.name = "EssayReviewProviderError";
  }
}

export class EssayReviewResponseError extends Error {
  readonly code = "REVIEW_RESPONSE_INVALID";

  constructor(readonly details: string, source = "Provider") {
    super(`${source} returned an invalid Essay Review 2.0 response: ${details}`);
    this.name = "EssayReviewResponseError";
  }
}

export class EssayReviewQualityError extends Error {
  readonly code = "REVIEW_QUALITY_FAILED";

  constructor(
    readonly findings: readonly ReviewQualityFinding[],
    readonly attempts: 2,
  ) {
    super("Essay review failed semantic quality validation after two attempts.");
    this.name = "EssayReviewQualityError";
  }
}
