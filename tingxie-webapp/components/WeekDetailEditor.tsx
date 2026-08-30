"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { addWordsToWeek, removeWordFromWeek } from "@/app/actions/manage";

export default function WeekDetailEditor({ week }: { week: any }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const res = await addWordsToWeek(week.id, input);

    if (res.success) {
      setSuccessMsg(`成功导入 ${res.addedCount} 个词汇！`);
      setInput("");
    } else {
      setError(res.error || "导入失败");
    }
    setLoading(false);
  };

  const handleRemove = async (wordId: number, content: string) => {
    if (confirm(`确定要从此周移除“${content}”吗？`)) {
      await removeWordFromWeek(week.id, wordId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Add Form */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" />
          添加新词汇（支持每行一个，或逗号分隔）
        </h3>

        {error && (
          <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl mb-3">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl mb-3 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAdd} className="space-y-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder={
              week.language === "en"
                ? "例如:\nbeautiful\nextraordinary\nfabulous"
                : "例如:\n忍不住\n看新闻\n国内外"
            }
            className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-sans"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-xs transition disabled:opacity-50 min-h-[44px]"
            >
              {loading ? "提交中..." : "保存新增词汇"}
            </button>
          </div>
        </form>
      </div>

      {/* Words List */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100">
        <h3 className="text-sm font-bold text-slate-800 mb-4">
          词汇列表 ({week.wordLists.length})
        </h3>

        {week.wordLists.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            暂无词汇，请在上方框内输入词汇并保存
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {week.wordLists.map((item: any, idx: number) => (
              <div
                key={item.word.id}
                className="py-3 flex items-center justify-between group hover:bg-amber-50/30 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-xs text-gray-400 font-mono">
                    {idx + 1}.
                  </span>
                  <span className="font-semibold text-slate-800 text-base">
                    {item.word.content}
                  </span>
                </div>

                <button
                  onClick={() => handleRemove(item.word.id, item.word.content)}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  title="删除词汇"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
