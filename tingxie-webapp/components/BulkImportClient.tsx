"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addWordsToWeek } from "@/app/actions/manage";
import { FileText, CheckCircle2, ArrowRight } from "lucide-react";

export default function BulkImportClient({ weeks }: { weeks: any[] }) {
  const router = useRouter();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    weeks[0]?.id ? String(weeks[0].id) : ""
  );
  const [rawText, setRawText] = useState("");
  const [parsedWords, setParsedWords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleParse = (text: string) => {
    setRawText(text);
    const words = Array.from(
      new Set(
        text
          .split(/[\n,，]+/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0)
      )
    );
    setParsedWords(words);
  };

  const handleImport = async () => {
    if (!selectedWeekId) {
      setError("请选择目标周次");
      return;
    }
    if (parsedWords.length === 0) {
      setError("没有解析出可导入的词汇");
      return;
    }

    setLoading(true);
    setError("");

    const res = await addWordsToWeek(parseInt(selectedWeekId, 10), rawText);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/manage/week/${selectedWeekId}`);
      }, 1200);
    } else {
      setError(res.error || "导入失败");
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Target Week Selection */}
      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <label className="block text-sm font-bold text-slate-800 mb-2">
          选择目标练习周次
        </label>
        {weeks.length === 0 ? (
          <div className="text-sm text-gray-500">
            暂无周次，请先在控制台创建周次。
          </div>
        ) : (
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-xl text-base bg-white focus:outline-none focus:border-indigo-500"
          >
            {weeks.map((w) => (
              <option key={w.id} value={w.id}>
                [{w.language === "en" ? "英文" : "华文"}] 第 {w.number} 周 — {w.title} ({w.wordLists.length} 词)
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Raw Text Input */}
      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            粘贴批量词汇
          </label>
          <span className="text-xs text-gray-400">支持每行一词或逗号分隔</span>
        </div>

        <textarea
          value={rawText}
          onChange={(e) => handleParse(e.target.value)}
          rows={6}
          placeholder="例如:\ndescription\nequipment\nfreezer\ningredients\nyoungster"
          className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-sans"
        />
      </div>

      {/* Parsed Preview Table */}
      {parsedWords.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3">
            解析成功 ({parsedWords.length} 个词汇)
          </h3>

          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-amber-50/40 rounded-xl border border-amber-100">
            {parsedWords.map((word, i) => (
              <span
                key={i}
                className="px-3 py-1 bg-white border border-amber-200 text-slate-800 text-sm font-medium rounded-lg shadow-2xs"
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          导入成功！正在跳转至该周页面...
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={loading || parsedWords.length === 0 || !selectedWeekId}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base rounded-2xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[50px]"
      >
        {loading ? "导入处理中..." : `确认导入 ${parsedWords.length} 个词汇到选定周次`}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
