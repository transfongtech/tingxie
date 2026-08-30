"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { WritingSidebar } from "./WritingSidebar";
import { CompositionEditor } from "./CompositionEditor";
import { PromptViewer } from "./PromptViewer";

interface CompositionWritingAreaProps {
  promptId: number;
  promptTitle: string;
  promptDescription?: string | null;
  images: { id: number; imagePath: string; sortOrder: number }[];
  lastSubmittedAt?: string | null;
}

export function CompositionWritingArea({
  promptId,
  promptTitle,
  promptDescription,
  images,
  lastSubmittedAt,
}: CompositionWritingAreaProps) {
  const [inserter, setInserter] = useState<((phrase: string) => void) | null>(null);
  const [leftWidthPercent, setLeftWidthPercent] = useState(42);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleRegister = useCallback((handler: (phrase: string) => void) => {
    setInserter(() => handler);
  }, []);

  const handleInsertPhrase = useCallback(
    (phrase: string) => {
      if (inserter) {
        inserter(phrase);
      }
    },
    [inserter]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(Math.max((x / rect.width) * 100, 25), 65);
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
      const percent = Math.min(Math.max((x / rect.width) * 100, 25), 65);
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

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col lg:flex-row min-h-0 h-full gap-y-4 select-none overflow-hidden pb-1"
    >
      {/* ─── Left Column: Prompt Picture (Top) + Writing Helpers (Bottom) ─── */}
      <div
        className="flex flex-col min-w-0 space-y-3 overflow-y-auto pr-1 h-full"
        style={{ width: `${leftWidthPercent}%` }}
      >
        {/* Top: Picture Prompt Viewer */}
        <div className="bg-white rounded-3xl p-3 md:p-4 border border-amber-100/90 shadow-xs shrink-0">
          <PromptViewer
            title={promptTitle}
            description={promptDescription ?? null}
            images={images}
          />
        </div>

        {/* Bottom: Writing Sidebar (Story Mountain / Phrase Bank) */}
        <div className="flex-1 min-h-0">
          <WritingSidebar
            promptId={promptId}
            images={images}
            onInsertPhrase={handleInsertPhrase}
          />
        </div>
      </div>

      {/* ─── Drag Handle Divider ─── */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          e.preventDefault();
          isDragging.current = true;
        }}
        className="hidden lg:flex w-3 flex-shrink-0 items-center justify-center cursor-col-resize group hover:bg-violet-50 transition-colors relative z-10 mx-1"
        title="Drag to resize split panes"
      >
        <div className="w-1.5 h-20 rounded-full bg-amber-200/80 group-hover:bg-violet-500 group-active:bg-violet-700 transition-colors shadow-2xs" />
      </div>

      {/* ─── Right Column: Immersive Composition Editor (Full Height Aligned) ─── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        <CompositionEditor
          promptId={promptId}
          promptTitle={promptTitle}
          lastSubmittedAt={lastSubmittedAt}
          onRegisterInsertHandler={handleRegister}
        />
      </div>
    </div>
  );
}
