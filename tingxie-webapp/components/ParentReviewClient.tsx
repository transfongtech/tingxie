"use client";

import { useState } from "react";
import { submitParentReview } from "@/app/actions/practice-session";
import { Check, X, CheckCircle2 } from "lucide-react";

export default function ParentReviewClient({ sessions }: { sessions: any[] }) {
  const [currentSessionIdx, setCurrentSessionIdx] = useState(0);
  const session = sessions[currentSessionIdx];

  const [marks, setMarks] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!session) return null;

  const toggleMark = (wordId: number, isCorrect: boolean) => {
    setMarks((prev) => ({
      ...prev,
      [wordId]: isCorrect,
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const results = session.results.map((res: any) => ({
      wordId: res.word.id,
      isCorrect: marks[res.word.id] ?? true,
    }));

    const res = await submitParentReview(session.id, results);
    if (res.success) {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-amber-100 shadow-xs text-center space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">批改已保存！</h2>
        <p className="text-gray-500 text-sm">错词已成功同步至 George 的记忆复习队列中。</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium text-sm rounded-xl"
        >
          刷新批改列表
        </button>
      </div>
    );
  }

  const allMarked = session.results.every(
    (res: any) => marks[res.word.id] !== undefined
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/60">
            {session.week ? `第 ${session.week.number} 周 — ${session.week.title}` : "华文听写练习"}
          </span>
          <span className="text-xs text-gray-400">
            {new Date(session.startedAt).toLocaleString()}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          请比对 George 的纸上听写结果，逐词点击标记 ✅ 或 ❌：
        </p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-3">
        {session.results.map((res: any, idx: number) => {
          const mark = marks[res.word.id];
          return (
            <div
              key={res.word.id}
              className="py-3 px-4 rounded-xl border border-gray-100 flex items-center justify-between bg-amber-50/20"
            >
              <div>
                <span className="text-xs text-gray-400 mr-2">{idx + 1}.</span>
                <span className="font-bold text-lg text-slate-800 font-kaiti">
                  {res.word.content}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMark(res.word.id, false)}
                  className={`w-12 h-10 rounded-xl flex items-center justify-center font-bold transition active:scale-95 ${
                    mark === false
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-gray-100 text-gray-400 hover:bg-amber-100"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleMark(res.word.id, true)}
                  className={`w-12 h-10 rounded-xl flex items-center justify-center font-bold transition active:scale-95 ${
                    mark === true
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "bg-gray-100 text-gray-400 hover:bg-emerald-100"
                  }`}
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !allMarked}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl shadow-xs transition disabled:opacity-50 min-h-[50px]"
      >
        {loading ? "提交中..." : allMarked ? "确认提交批改结果" : "请先标完所有词语"}
      </button>
    </div>
  );
}
