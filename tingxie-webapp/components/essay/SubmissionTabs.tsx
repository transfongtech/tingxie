"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { EssayReviewResult, Annotation } from "@/lib/essay-types";
import { AnnotatedText } from "./AnnotatedText";
import { PolishedView } from "./PolishedView";
import { ScoreCard } from "./ScoreCard";
import { ErrorStats } from "./ErrorStats";
import {
  Search, Sparkles, Award,
  AlertCircle, CheckCircle, Info, X,
} from "lucide-react";

import { AnnotationFilter, FilterCategory } from "./AnnotationFilter";

interface SubmissionTabsProps {
  originalText: string;
  reviewResult: EssayReviewResult;
  totalScore: number;
  promptTitle: string;
}

// ─── Annotation type helpers ───
function getTypeStyle(type: Annotation["type"]) {
  switch (type) {
    case "spelling":
      return "bg-rose-50 text-rose-950 border-rose-300";
    case "grammar":
      return "bg-amber-100 text-amber-900 border-amber-500";
    case "structure":
      return "bg-blue-100 text-blue-900 border-blue-500";
    case "vocabulary":
      return "bg-emerald-100 text-emerald-900 border-emerald-500";
    default:
      return "bg-gray-100 text-gray-900 border-gray-400";
  }
}

function getTypeLabel(type: Annotation["type"]) {
  switch (type) {
    case "spelling": return "Spelling Mistake";
    case "grammar": return "Grammar / Tense";
    case "structure": return "Sentence Structure";
    case "vocabulary": return "Vocabulary Suggestion";
  }
}

export function SubmissionTabs({ originalText, reviewResult, promptTitle }: SubmissionTabsProps) {
  const [activeTab, setActiveTab] = useState<"polished" | "score">("score");
  const [activeAnnotation, setActiveAnnotation] = useState<Annotation | null>(null);
  const [annotationFilter, setAnnotationFilter] = useState<FilterCategory>("all");
  const [leftWidthPercent, setLeftWidthPercent] = useState(55);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const filteredAnnotations =
    annotationFilter === "all"
      ? reviewResult.annotations
      : reviewResult.annotations.filter((a) => a.type === annotationFilter);

  const handleAnnotationSelect = useCallback((annotation: Annotation | null) => {
    setActiveAnnotation(annotation);
    // 选中批注时，滚动右侧面板到顶部查看详情
    if (annotation && rightPanelRef.current) {
      rightPanelRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextTab =
      event.key === "ArrowLeft" || event.key === "Home" ? "score" : "polished";
    setActiveTab(nextTab);
    document.getElementById(nextTab === "score" ? "feedback-tab" : "polished-tab")?.focus();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(Math.max((x / rect.width) * 100, 30), 70);
      setLeftWidthPercent(percent);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const percent = Math.min(Math.max((x / rect.width) * 100, 30), 70);
      setLeftWidthPercent(percent);
    };

    const handleTouchEnd = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const wordCount = originalText.trim() ? originalText.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col gap-4 lg:h-[calc(100vh-120px)] lg:flex-row lg:gap-0"
      style={{
        "--left-panel-width": `${leftWidthPercent}%`,
        "--right-panel-width": `${100 - leftWidthPercent}%`,
      } as React.CSSProperties}
    >
      {/* ─── Left Panel: Original Text with Annotations ─── */}
      <div
        className="flex min-h-[60vh] w-full min-w-0 flex-col overflow-hidden lg:min-h-0 lg:w-[var(--left-panel-width)]"
      >
        {/* Left Header */}
        <div className="flex flex-col px-5 py-3 border-b border-amber-100/90 bg-white/80 backdrop-blur-sm rounded-t-2xl gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Search className="w-4 h-4 text-violet-600 shrink-0" />
              <span className="text-sm font-bold text-gray-800">
                George&apos;s Original
              </span>
              <span className="px-2.5 py-0.5 bg-violet-100/80 text-violet-800 font-extrabold text-xs rounded-full border border-violet-200/60 shadow-2xs">
                {wordCount} words
              </span>
            </div>
            <ErrorStats annotations={reviewResult.annotations} compact />
          </div>

          {/* Category Filter */}
          <AnnotationFilter
            annotations={reviewResult.annotations}
            activeFilter={annotationFilter}
            onFilterChange={setAnnotationFilter}
          />
        </div>

        {/* Left Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[#FEFCF8] rounded-b-2xl border border-amber-100/90 shadow-xs">
          <div className="p-6">
            <AnnotatedText
              originalText={originalText}
              annotations={filteredAnnotations}
              activeAnnotation={activeAnnotation}
              onAnnotationSelect={handleAnnotationSelect}
              dimUnmatched={annotationFilter !== "all"}
            />
          </div>
        </div>
      </div>

      {/* ─── Drag Handle ─── */}
      <div
        role="separator"
        aria-label="Resize essay and feedback panels"
        aria-orientation="vertical"
        aria-valuemin={30}
        aria-valuemax={70}
        aria-valuenow={Math.round(leftWidthPercent)}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={(event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          setLeftWidthPercent((width) =>
            Math.min(70, Math.max(30, width + (event.key === "ArrowLeft" ? -5 : 5))),
          );
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          isDragging.current = true;
        }}
        className="group relative z-10 hidden w-3 flex-shrink-0 cursor-col-resize items-center justify-center transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600 lg:flex"
        title="Drag to resize"
      >
        <div className="w-1 h-16 rounded-full bg-gray-200 group-hover:bg-violet-400 group-active:bg-violet-600 transition-colors" />
      </div>

      {/* ─── Right Panel: Annotation Detail + Tabs ─── */}
      <div
        className="flex min-h-[70vh] w-full min-w-0 flex-col overflow-hidden lg:min-h-0 lg:w-[var(--right-panel-width)]"
      >
        {/* Right Tab Bar */}
        <div
          role="tablist"
          aria-label="Review views"
          className="flex bg-white p-1.5 rounded-t-2xl border-b border-amber-100/90"
        >
          <button
            type="button"
            role="tab"
            id="feedback-tab"
            aria-selected={activeTab === "score"}
            aria-controls="feedback-panel"
            tabIndex={activeTab === "score" ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab("score")}
            className={`flex-1 min-h-11 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              activeTab === "score"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Award aria-hidden="true" className="w-4 h-4" /> My Feedback
          </button>

          <button
            type="button"
            role="tab"
            id="polished-tab"
            aria-selected={activeTab === "polished"}
            aria-controls="polished-panel"
            tabIndex={activeTab === "polished" ? 0 : -1}
            onKeyDown={handleTabKeyDown}
            onClick={() => setActiveTab("polished")}
            className={`flex-1 min-h-11 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${
              activeTab === "polished"
                ? "bg-violet-600 text-white shadow-xs"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Sparkles aria-hidden="true" className="w-4 h-4" /> Polished Version
          </button>
        </div>

        {/* Right Scrollable Content */}
        <div
          ref={rightPanelRef}
          className="flex-1 overflow-y-auto bg-white rounded-b-2xl border border-amber-100/90 shadow-xs"
        >
          <div className="p-6 space-y-5">
            {/* ─── Annotation Detail Card (appears when clicked on left) ─── */}
            {activeAnnotation && (
              <div className="bg-gradient-to-br from-violet-50 to-white rounded-2xl p-5 border-2 border-violet-200 shadow-md animate-in fade-in slide-in-from-top-2 duration-200 relative">
                <button
                  type="button"
                  aria-label="Close teacher note"
                  onClick={() => setActiveAnnotation(null)}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-3">
                  {/* Type Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getTypeStyle(activeAnnotation.type)}`}>
                      {getTypeLabel(activeAnnotation.type)}
                    </span>
                    <span className="text-xs text-gray-400">Teacher&apos;s Note</span>
                  </div>

                  {/* Original vs Correction */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 mb-1">
                        <AlertCircle className="w-3 h-3" /> George wrote:
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        &ldquo;{activeAnnotation.original}&rdquo;
                      </div>
                    </div>

                    <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                      <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3" /> Better:
                      </div>
                      <div className="font-bold text-emerald-900 text-sm">
                        &ldquo;{activeAnnotation.correction}&rdquo;
                      </div>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100">
                    <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mb-1">
                      <Info className="w-3 h-3 text-violet-500" /> Explanation:
                    </div>
                    <p className="text-gray-800 leading-relaxed text-sm">
                      {activeAnnotation.explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab Content ─── */}
            {activeTab === "score" && (
              <div
                role="tabpanel"
                id="feedback-panel"
                aria-labelledby="feedback-tab"
                className="animate-in fade-in duration-150"
              >
                <ScoreCard reviewResult={reviewResult} />
              </div>
            )}

            {activeTab === "polished" && (
              <div
                role="tabpanel"
                id="polished-panel"
                aria-labelledby="polished-tab"
                className="animate-in fade-in duration-150"
              >
                <PolishedView
                  polishedText={reviewResult.polishedText}
                  promptTitle={promptTitle}
                  scores={reviewResult.scores}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
