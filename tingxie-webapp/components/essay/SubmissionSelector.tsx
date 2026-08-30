"use client";

import { useRouter } from "next/navigation";
import { History, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface SelectorItem {
  id: number;
  score: number | null;
  wordCount: number;
  submittedAt: string;
  label: string;
}

interface SubmissionSelectorProps {
  items: SelectorItem[];
  currentId: number;
}

export function SubmissionSelector({ items, currentId }: SubmissionSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = items.find((i) => i.id === currentId);
  const currentIndex = items.findIndex((i) => i.id === currentId);

  // 关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="px-3.5 py-2.5 bg-white border border-amber-200 text-gray-700 hover:bg-amber-50 rounded-xl font-medium text-xs flex items-center gap-2 shadow-xs transition-colors min-h-[40px]"
      >
        <History className="w-4 h-4 text-violet-600" />
        <span>
          Attempt {items.length - currentIndex} of {items.length}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-amber-100 rounded-2xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-4 py-2.5 bg-amber-50/50 border-b border-amber-100">
            <span className="text-xs font-bold text-gray-600">
              {items.length} Submissions for this Topic
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {items.map((item, idx) => {
              const isActive = item.id === currentId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setOpen(false);
                    if (!isActive) {
                      router.push(`/essay/submission/${item.id}`);
                    }
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-violet-50 transition-colors flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 ${
                    isActive ? "bg-violet-50/70" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* 序号圆点 */}
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isActive
                        ? "bg-violet-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {items.length - idx}
                    </span>

                    <div className="min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {formatDate(item.submittedAt)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {item.wordCount} words
                      </div>
                    </div>
                  </div>

                  {/* 分数 */}
                  {item.score !== null && (
                    <span className={`text-sm font-bold flex-shrink-0 ${
                      item.score >= 28
                        ? "text-emerald-600"
                        : item.score >= 20
                        ? "text-amber-600"
                        : "text-red-500"
                    }`}>
                      {item.score}/36
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
