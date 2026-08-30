"use client";

import { Annotation } from "@/lib/essay-types";

interface ErrorStatsProps {
  annotations: Annotation[];
  compact?: boolean;
}

export function ErrorStats({ annotations, compact }: ErrorStatsProps) {
  const counts = {
    spelling: annotations.filter((a) => a.type === "spelling").length,
    grammar: annotations.filter((a) => a.type === "grammar").length,
    structure: annotations.filter((a) => a.type === "structure").length,
    vocabulary: annotations.filter((a) => a.type === "vocabulary").length,
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        {counts.spelling > 0 && (
          <span className="flex items-center gap-1 text-rose-800 font-semibold">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-rose-400" />
            Spelling {counts.spelling}
          </span>
        )}
        {counts.grammar > 0 && (
          <span className="flex items-center gap-1 text-amber-700 font-semibold">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-amber-500" />
            Grammar {counts.grammar}
          </span>
        )}
        {counts.structure > 0 && (
          <span className="flex items-center gap-1 text-blue-700 font-semibold">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-blue-500" />
            Structure {counts.structure}
          </span>
        )}
        {counts.vocabulary > 0 && (
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-500" />
            Vocabulary {counts.vocabulary}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-amber-100/80 shadow-xs text-xs">
      <span className="font-bold text-gray-500 mr-1">Marking Summary:</span>

      <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full font-semibold border border-red-100 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-red-500" />
        Spelling ({counts.spelling})
      </span>

      <span className="px-3 py-1 bg-amber-50 text-amber-800 rounded-full font-semibold border border-amber-100 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Grammar & Tense ({counts.grammar})
      </span>

      <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-semibold border border-blue-100 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Structure ({counts.structure})
      </span>

      <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full font-semibold border border-emerald-100 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        Vocab Upgrades ({counts.vocabulary})
      </span>
    </div>
  );
}
