"use client";

import { useState } from "react";
import { Plus, Trash2, Tag, Sparkles } from "lucide-react";

interface Phrase {
  id: number;
  content: string;
  category: string;
  source: string;
}

const CATEGORY_OPTIONS = [
  { key: "fear", label: "Fear & Shock (😨 害怕与惊恐)" },
  { key: "happiness", label: "Happiness (😊 开心与自豪)" },
  { key: "sadness", label: "Sadness (😢 伤心与羞愧)" },
  { key: "anger", label: "Anger (😡 生气与怒火)" },
  { key: "urgency", label: "Urgency & Action (🏃 紧急与行动)" },
  { key: "surprise", label: "Surprise & Relief (😮 惊讶与松一口气)" },
  { key: "weather", label: "Weather & Setting (🌤️ 天气与环境)" },
  { key: "description", label: "Description (👀 动作与细节描写)" },
];

export default function ManagePhrasesClient({ initialPhrases }: { initialPhrases: Phrase[] }) {
  const [phrases, setPhrases] = useState<Phrase[]>(initialPhrases);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("fear");
  const [loading, setLoading] = useState(false);
  const [filterSource, setFilterSource] = useState<string>("all");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/essay/phrases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), category }),
      });
      const data = await res.json();
      if (data.success) {
        setPhrases((prev) => [data.phrase, ...prev]);
        setContent("");
      } else {
        alert("添加失败：" + data.error);
      }
    } catch (e: any) {
      alert("错误：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, text: string) => {
    if (!confirm(`确定要删除语块 "${text}" 吗？`)) return;

    try {
      const res = await fetch(`/api/essay/phrases?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPhrases((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("删除失败：" + data.error);
      }
    } catch (e: any) {
      alert("错误：" + e.message);
    }
  };

  const filtered =
    filterSource === "all"
      ? phrases
      : phrases.filter((p) => p.source === filterSource);

  return (
    <div className="space-y-6">
      {/* Form: Add Manual Phrase */}
      <form
        onSubmit={handleAdd}
        className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-4"
      >
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Plus className="w-5 h-5 text-indigo-600" />
          手动新增实用写作语块 (Add Custom Phrase)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-7">
            <label className="block text-xs font-bold text-gray-500 mb-1">
              英文短语内容 (Phrase Content)
            </label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="例如: trembled with fear, eyes lit up with joy"
              required
              className="w-full px-3.5 py-2.5 bg-amber-50/40 border border-amber-200 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-xs font-bold text-gray-500 mb-1">
              所属分类 (Category)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 bg-amber-50/40 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          {loading ? "保存中..." : "保存新语块"}
        </button>
      </form>

      {/* Filter Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs font-bold text-gray-500">
          已列出 {filtered.length} 个语块
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">来源筛选:</span>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="px-3 py-1.5 bg-white border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none shadow-2xs"
          >
            <option value="all">全部来源 (All Sources)</option>
            <option value="preset">📦 预置语块 (Preset)</option>
            <option value="ai">🤖 AI 自动收集 (AI Extracted)</option>
            <option value="manual">✏️ 家长录入 (Manual)</option>
          </select>
        </div>
      </div>

      {/* Phrase Table / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((phrase) => (
          <div
            key={phrase.id}
            className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center justify-between gap-3 hover:border-amber-300 transition"
          >
            <div className="space-y-1 min-w-0">
              <div className="font-bold text-slate-800 text-sm truncate">
                "{phrase.content}"
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-100/60 text-amber-900 text-[10px] font-bold rounded-md uppercase">
                  {phrase.category}
                </span>
                <span className="text-[10px] text-gray-400 capitalize">
                  {phrase.source}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleDelete(phrase.id, phrase.content)}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition shrink-0"
              title="删除此语块"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
