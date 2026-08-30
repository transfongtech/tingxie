"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { addWordsToWeek } from "@/app/actions/manage";

export default function PhotoImport({ weeks }: { weeks: any[] }) {
  const router = useRouter();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(
    weeks[0]?.id ? String(weeks[0].id) : ""
  );
  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [ocrWords, setOcrWords] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingOcr(true);
    setError("");
    setOcrWords([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.words)) {
        setOcrWords(data.words);
      } else {
        setError(data.error || "识别失败，请手动修正或更换更清晰的照片");
      }
    } catch {
      setError("网络开小差了，请重试");
    } finally {
      setLoadingOcr(false);
    }
  };

  const handleWordChange = (idx: number, newVal: string) => {
    const next = [...ocrWords];
    next[idx] = newVal;
    setOcrWords(next);
  };

  const handleRemoveWord = (idx: number) => {
    setOcrWords((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmImport = async () => {
    if (!selectedWeekId) {
      setError("请选择目标周次");
      return;
    }
    const clean = ocrWords.map((w) => w.trim()).filter((w) => w.length > 0);
    if (clean.length === 0) {
      setError("没有可导入的词汇");
      return;
    }

    setLoadingImport(true);
    setError("");

    const res = await addWordsToWeek(parseInt(selectedWeekId, 10), clean.join("\n"));

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push(`/manage/week/${selectedWeekId}`);
      }, 1200);
    } else {
      setError(res.error || "导入失败");
    }
    setLoadingImport(false);
  };

  return (
    <div className="space-y-6">
      {/* Target Week Selection */}
      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <label className="block text-sm font-bold text-slate-800 mb-2">
          1. 选择目标练习周次
        </label>
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
      </div>

      {/* Camera Photo Upload Button */}
      <div className="bg-white p-6 rounded-2xl border border-amber-100 shadow-xs text-center">
        <label className="block text-sm font-bold text-slate-800 mb-4">
          2. 拍摄或上传听写本照片
        </label>

        <label className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xs cursor-pointer transition min-h-[50px]">
          {loadingOcr ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          {loadingOcr ? "AI 识别词汇中..." : "📷 打开相机 / 选择照片"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            disabled={loadingOcr}
            className="hidden"
          />
        </label>
      </div>

      {/* Editable Verification Table */}
      {ocrWords.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              3. 家长核对与修改 ({ocrWords.length} 个词)
            </h3>
            <span className="text-xs text-amber-700">（可在输入框直接修正识别错字）</span>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {ocrWords.map((word, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400 w-6">{idx + 1}.</span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(idx, e.target.value)}
                  className="flex-1 p-2.5 border border-gray-200 rounded-xl text-base focus:border-indigo-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveWord(idx)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmImport}
            disabled={loadingImport || ocrWords.length === 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[50px]"
          >
            {loadingImport ? "保存中..." : "确认并导入到数据库"}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 text-amber-900 border border-amber-200 text-sm rounded-xl">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-200 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          导入成功！正在跳转该周页面...
        </div>
      )}
    </div>
  );
}
