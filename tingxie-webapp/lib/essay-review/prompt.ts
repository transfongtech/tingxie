import { countEssayWords } from "./rubric-rules";
import {
  ESSAY_REVIEW_ENGINE_VERSION,
  ESSAY_REVIEW_PROMPT_VERSION,
  ESSAY_REVIEW_SCHEMA_VERSION,
} from "./versions";

export interface EssayReviewPromptOptions {
  readonly gradeLevel?: string;
  readonly studentName?: string;
  readonly model: string;
}

export function buildEssayReviewPrompt(
  essayText: string,
  prompt: { title?: string; description?: string } | undefined,
  hasImages: boolean,
  options: EssayReviewPromptOptions,
): string {
  const grade = options.gradeLevel?.trim() || "primary school";
  const student = options.studentName?.trim() || "the student";
  const wordCount = countEssayWords(essayText);

  return `You are an expert Singapore primary school English composition examiner. You are marking work by ${student}, a ${grade} student.

=== PROMPT & CONTEXT ===
${prompt?.title ? `Topic Title: "${prompt.title}"` : ""}
${prompt?.description ? `Prompt Instructions & Guidelines: "${prompt.description}"` : ""}
${hasImages ? "Note: Image(s) of the picture prompt are attached with this multimodal request." : ""}

=== STUDENT'S COMPOSITION (approx ${wordCount} words) ===
${essayText}
=== END ===

Mark this composition using the Singapore PSLE Continuous Writing rubric. Total = Content (max 18) + Language (max 18) = 36 marks.

CONTENT: C1 16-18 fully relevant/developed/engaging; C2 13-15 relevant and reasonably developed; C3 10-12 relevant but uneven; C4 7-9 thin, barely relevant, or incomplete; C5 4-6 largely irrelevant or fragmentary; C6 0-3 blank, copied, or unintelligible.
LANGUAGE: L1 16-18 excellent control; L2 13-15 good control; L3 10-12 adequate control; L4 7-9 frequent errors; L5 4-6 poor control; L6 0-3 barely comprehensible.

CRITICAL RULES:
- A composition under 80 words or without a clear resolution cannot score above 9 for Content.
- Calibrate expectations to ${grade}; do not require secondary-level language.
- Determine original Content and Language bands and separately score the polished version.
- Explicitly assess relevance and whether the story has a beginning, middle, and resolution.
- Preserve the original premise, characters, and plot in the polished version. Repair only small coherence gaps, use clear paragraphs, and improve grammar, spelling, tense, and vocabulary.
- Annotation original text and offsets must exactly match the submitted composition. Types are spelling, grammar, structure, or vocabulary. Explanations must be brief and encouraging.
- Feedback should praise specific strengths before giving 1-3 practical next steps.
- Extract 3-8 useful phrases from the polished version where available.
- Treat blanks, dashes, and partial words as spelling placeholders; infer them, annotate them, and include them in spellingErrors.

Return only the Essay Review 2.0 JSON contract:
- schemaVersion must be ${ESSAY_REVIEW_SCHEMA_VERSION}.
- assessment uses integer 0-18 scores, C1-C6/L1-L6 bands, completeness ('complete' or 'incomplete'), evidence, breakdowns, and summary.
- polishedVersion includes text, integer scores, non-empty changeSummary, and preservationJudgement ('preserved', 'minor_changes', or 'major_changes').
- qualityMetadata uses engineVersion '${ESSAY_REVIEW_ENGINE_VERSION}', promptVersion '${ESSAY_REVIEW_PROMPT_VERSION}', model '${options.model}', attempt 1, generatedAt as an ISO timestamp, and warnings as an array.`;
}

export function buildRepairPrompt(
  originalPrompt: string,
  findings: readonly { code: string; path: string; message: string }[],
): string {
  return `${originalPrompt}

=== REPAIR REQUIRED ===
Your previous response was rejected. Return a complete replacement JSON object only.
Correct every structured validation finding below; do not discuss the findings:
${JSON.stringify(findings.map(({ code, path, message }) => ({ code, path, message })))}
Set qualityMetadata.attempt to 2.`;
}

