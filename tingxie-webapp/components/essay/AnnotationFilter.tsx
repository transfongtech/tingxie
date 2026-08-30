"use client";

import { Annotation } from "@/lib/essay-types";

export type FilterCategory = "all" | "spelling" | "grammar" | "structure" | "vocabulary";

interface AnnotationFilterProps {
  annotations: Annotation[];
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
}

export function AnnotationFilter({
  annotations,
  activeFilter,
  onFilterChange,
}: AnnotationFilterProps) {
  const counts = {
    spelling: annotations.filter((a) => a.type === "spelling").length,
    grammar: annotations.filter((a) => a.type === "grammar").length,
    structure: annotations.filter((a) => a.type === "structure").length,
    vocabulary: annotations.filter((a) => a.type === "vocabulary").length,
  };

  const getTabStyle = (type: FilterCategory) => {
    const isActive = activeFilter === type;

    switch (type) {
      case "all":
        return isActive
          ? "bg-slate-800 text-white font-bold shadow-xs"
          : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50";
      case "spelling":
        return isActive
          ? "bg-red-600 text-white font-bold shadow-xs"
          : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100/80";
      case "grammar":
        return isActive
          ? "bg-amber-600 text-white font-bold shadow-xs"
          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100/80";
      case "structure":
        return isActive
          ? "bg-blue-600 text-white font-bold shadow-xs"
          : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100/80";
      case "vocabulary":
        return isActive
          ? "bg-emerald-600 text-white font-bold shadow-xs"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100/80";
    }
  };

  const handleClick = (type: FilterCategory) => {
    if (activeFilter === type && type !== "all") {
      onFilterChange("all");
    } else {
      onFilterChange(type);
    }
  };

  return (
    <div className="flex items-center gap-1.5 flex-wrap my-3">
      <button
        onClick={() => handleClick("all")}
        className={`px-3 py-1.5 rounded-lg text-xs transition min-h-[32px] ${getTabStyle("all")}`}
      >
        All ({annotations.length})
      </button>

      <button
        onClick={() => handleClick("spelling")}
        className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 min-h-[32px] ${getTabStyle(
          "spelling"
        )}`}
      >
        Spelling <span className="opacity-80">({counts.spelling})</span>
      </button>

      <button
        onClick={() => handleClick("grammar")}
        className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 min-h-[32px] ${getTabStyle(
          "grammar"
        )}`}
      >
        Grammar <span className="opacity-80">({counts.grammar})</span>
      </button>

      <button
        onClick={() => handleClick("structure")}
        className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 min-h-[32px] ${getTabStyle(
          "structure"
        )}`}
      >
        Structure <span className="opacity-80">({counts.structure})</span>
      </button>

      <button
        onClick={() => handleClick("vocabulary")}
        className={`px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 min-h-[32px] ${getTabStyle(
          "vocabulary"
        )}`}
      >
        Vocabulary <span className="opacity-80">({counts.vocabulary})</span>
      </button>
    </div>
  );
}
