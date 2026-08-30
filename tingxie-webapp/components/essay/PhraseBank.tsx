"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Sparkles,
  BookOpen,
  Check,
  ShieldAlert,
  Smile,
  Frown,
  Flame,
  Zap,
  Cloud,
  Eye,
  Shuffle,
} from "lucide-react";

interface PhraseItem {
  id: number;
  content: string;
  category: string;
  source: string;
}

interface PhraseBankProps {
  onInsertPhrase?: (phrase: string) => void;
}

const CATEGORIES: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: "fear", label: "Fear & Shock", icon: <ShieldAlert className="w-3.5 h-3.5 text-red-500" /> },
  { key: "happiness", label: "Happiness", icon: <Smile className="w-3.5 h-3.5 text-emerald-500" /> },
  { key: "sadness", label: "Sadness", icon: <Frown className="w-3.5 h-3.5 text-blue-500" /> },
  { key: "anger", label: "Anger", icon: <Flame className="w-3.5 h-3.5 text-orange-500" /> },
  { key: "urgency", label: "Urgency", icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
  { key: "surprise", label: "Surprise", icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" /> },
  { key: "weather", label: "Weather", icon: <Cloud className="w-3.5 h-3.5 text-cyan-500" /> },
  { key: "description", label: "Description", icon: <Eye className="w-3.5 h-3.5 text-indigo-500" /> },
];

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function PhraseBank({ onInsertPhrase }: PhraseBankProps) {
  const [phrases, setPhrases] = useState<PhraseItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [insertedId, setInsertedId] = useState<number | null>(null);

  const fetchPhrases = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/essay/phrases");
      const data: unknown = await res.json();
      if (
        !res.ok ||
        !data ||
        typeof data !== "object" ||
        !("success" in data) ||
        !(data as { success: unknown }).success
      ) {
        throw new Error(
          data && typeof data === "object" && "error" in data
            ? String((data as { error: unknown }).error)
            : "Failed to fetch phrases",
        );
      }
      const next = (data as { phrases?: unknown }).phrases;
      if (!Array.isArray(next)) throw new Error("Phrase service returned invalid data");
      setPhrases(shuffleArray(next as PhraseItem[]));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to fetch phrases");
    } finally {
      setLoading(false);
    }
  };

  const handleShuffleRefresh = () => {
    setPhrases((prev) => shuffleArray(prev));
  };

  useEffect(() => {
    fetchPhrases();
  }, []);

  const handleInsert = (phrase: PhraseItem) => {
    if (onInsertPhrase) {
      onInsertPhrase(phrase.content);
      setInsertedId(phrase.id);
      setTimeout(() => setInsertedId(null), 1200);
    }
  };

  const filteredPhrases =
    activeCategory === "all"
      ? phrases
      : phrases.filter((p) => p.category === activeCategory);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "ai":
        return <span className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-700 rounded border border-blue-200/80 font-bold">AI</span>;
      case "manual":
        return <span className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded border border-emerald-200/80 font-bold">Custom</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-amber-100 p-3.5 shadow-2xs space-y-3 text-slate-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-amber-100/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-violet-50 text-violet-600 rounded-lg flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-xs text-slate-900">Visual Phrase Bank</h3>
            <p className="text-[10px] text-gray-400">Click [+] to insert phrases</p>
          </div>
        </div>
        <button
          onClick={handleShuffleRefresh}
          className="px-2 py-1 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200/60 transition flex items-center gap-1 shrink-0"
          title="Shuffle / Refresh random phrases"
        >
          <Shuffle className="w-3 h-3" /> Random
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1 shrink-0 ${
              activeCategory === cat.key
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-amber-50/50 text-gray-600 border border-amber-100 hover:bg-amber-100/60"
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Phrase List (Compact Container) */}
      <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
        {loading ? (
          <div className="p-4 text-center text-xs text-gray-400 animate-pulse">
            Loading phrase bank...
          </div>
        ) : error ? (
          <div role="alert" className="p-4 text-center text-xs text-red-600 bg-red-50 rounded-xl">
            <p>{error}</p>
            <button type="button" onClick={fetchPhrases} className="mt-2 font-bold underline">
              Try again
            </button>
          </div>
        ) : filteredPhrases.length === 0 ? (
          <div className="p-4 text-center text-xs text-gray-400 bg-amber-50/30 rounded-xl">
            No phrases for this category.
          </div>
        ) : (
          filteredPhrases.map((phrase) => (
            <div
              key={phrase.id}
              className="p-2 rounded-xl bg-amber-50/30 border border-amber-100/80 hover:border-indigo-200 transition flex items-center justify-between gap-2 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-xs text-slate-800 truncate">
                  “{phrase.content}”
                </span>
                {getSourceBadge(phrase.source)}
              </div>

              {onInsertPhrase && (
                <button
                  onClick={() => handleInsert(phrase)}
                  className={`p-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                    insertedId === phrase.id
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-600 hover:text-white"
                  }`}
                  title="Insert phrase into editor"
                >
                  {insertedId === phrase.id ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
