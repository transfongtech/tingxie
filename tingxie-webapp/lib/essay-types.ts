// ─── Grade Level 配置 ─────────────────────
// George 当前 P4 (2026 学年)
// 每年自动递增（新加坡学年 1 月开始，自然年边界吻合）
export function getCurrentGradeLevel(): string {
  const baseYear = 2026; // P4 的基准年
  const baseGrade = 4;
  const currentYear = new Date().getFullYear();
  const grade = Math.min(baseGrade + (currentYear - baseYear), 6); // 最高 P6
  return `P${grade}`;
}

// ─── AI 批改结果类型 ─────────────────────
import type {
  EssayReviewResultV2,
  ReviewAnnotation,
} from "./essay-review/schema";

export type Annotation = ReviewAnnotation;

export interface EssayReviewResult {
  /** The 2.0 domain result is present on newly generated reviews. */
  schemaVersion?: EssayReviewResultV2["schemaVersion"];
  studentFeedback?: EssayReviewResultV2["studentFeedback"];
  assessment?: EssayReviewResultV2["assessment"];
  polishedVersion?: EssayReviewResultV2["polishedVersion"];
  qualityMetadata?: EssayReviewResultV2["qualityMetadata"];
  annotations: Annotation[];
  /** @deprecated Read `polishedVersion.text` for new domain consumers. */
  polishedText: string;
  /** @deprecated Read `assessment` and `polishedVersion.scores`. */
  scores: {
    content: number; // 0-18
    language: number; // 0-18
    polishedScores?: {
      content: number; // 0-18
      language: number; // 0-18
    };
    contentBreakdown: {
      relevance: string;
      development: string;
      plotCoherence: string;
      engagement: string;
    };
    languageBreakdown: {
      grammar: string;
      vocabulary: string;
      spelling: string;
      organisation: string;
    };
  };
  /** @deprecated Read `studentFeedback` or `assessment.summary`. */
  summary: string; // 2-3 段英文评语
  spellingErrors: { wrong: string; correct: string }[];
  goodPhrases?: { phrase: string; category: string }[];
}

export interface EssayPromptData {
  id: number;
  title: string;
  description: string | null;
  images: { id: number; imagePath: string; sortOrder: number }[];
  submissionCount: number;
  latestScore: number | null;
  isActive: boolean;
  createdAt: Date;
}
