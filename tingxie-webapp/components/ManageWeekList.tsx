"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight, Calendar, Trash2, Filter } from "lucide-react";
import { createWeek, deleteWeek } from "@/app/actions/manage";

interface WeekItem {
  id: number;
  number: number;
  language: string;
  grade: number;
  term: number;
  title: string;
  dictationDate: Date | string | null;
  wordLists: any[];
}

export default function ManageWeekList({
  initialZhWeeks,
  initialEnWeeks,
}: {
  initialZhWeeks: WeekItem[];
  initialEnWeeks: WeekItem[];
}) {
  const [activeTab, setActiveTab] = useState<"en" | "zh">("en");
  const [selectedGrade, setSelectedGrade] = useState<number | "all">(4); // Default P4 for George
  const [selectedTerm, setSelectedTerm] = useState<number | "all">("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [number, setNumber] = useState("");
  const [grade, setGrade] = useState(3);
  const [term, setTerm] = useState(1);
  const [title, setTitle] = useState("");
  const [dictationDate, setDictationDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const rawWeeks = activeTab === "en" ? initialEnWeeks : initialZhWeeks;

  // 提取 Composition Bucket (number === 0)
  const compoBucket = rawWeeks.find((w) => w.number === 0);

  // Filter regular weeks by Grade and Term (excluding number === 0)
  const filteredWeeks = rawWeeks.filter((w) => {
    if (w.number === 0) return false;
    if (selectedGrade !== "all" && w.grade !== selectedGrade) return false;
    if (selectedTerm !== "all" && w.term !== selectedTerm) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await createWeek({
      number: parseInt(number, 10),
      language: activeTab,
      grade: Number(grade),
      term: Number(term),
      title: title || `Week ${number}`,
      dictationDate: dictationDate || undefined,
    });

    if (res.success) {
      setShowCreateModal(false);
      setNumber("");
      setTitle("");
      setDictationDate("");
    } else {
      setError(res.error || "创建失败");
    }
    setLoading(false);
  };

  const handleDelete = async (e: React.MouseEvent, weekId: number, weekTitle: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`确定要删除“${weekTitle}”及其所有关联词汇吗？`)) {
      await deleteWeek(weekId);
    }
  };

  return (
    <div>
      {/* Language Tabs */}
      <div className="flex bg-amber-100/40 p-1 rounded-xl mb-4">
        <button
          onClick={() => setActiveTab("en")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === "en"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🔤 英文 Spelling ({initialEnWeeks.length})
        </button>
        <button
          onClick={() => setActiveTab("zh")}
          className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition ${
            activeTab === "zh"
              ? "bg-white text-indigo-600 shadow-xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🈶 华文听写 ({initialZhWeeks.length})
        </button>
      </div>

      {/* ✍️ Special Dedicated Composition Bucket Card */}
      {activeTab === "en" && compoBucket && (
        <div className="mb-6">
          <div className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600" />
            作文积累专属词库 (Composition Bucket)
          </div>
          <Link
            href={`/manage/week/${compoBucket.id}`}
            className="bg-gradient-to-r from-violet-50 to-indigo-50 border-2 border-violet-200 p-4.5 rounded-2xl shadow-xs flex items-center justify-between hover:border-violet-400 transition group block"
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 bg-violet-600 text-white text-[11px] font-bold rounded-md uppercase tracking-wider">
                  作文专属词库
                </span>
                <span className="font-extrabold text-violet-950 text-base">
                  {compoBucket.title}
                </span>
              </div>
              <div className="text-xs text-violet-700/80 mt-1.5 font-medium">
                已收录 {compoBucket.wordLists.length} 个从作文批改中收集的词汇（点击可单独编辑、增删词汇）
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-violet-700 bg-white px-3 py-1.5 rounded-xl border border-violet-200 shadow-2xs group-hover:bg-violet-600 group-hover:text-white transition">
                管理词汇表 ➔
              </span>
            </div>
          </Link>
        </div>
      )}

      {/* Grade & Term Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-amber-100 mb-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
          <Filter className="w-4 h-4 text-indigo-600" />
          筛选维度:
        </div>

        <div className="flex items-center gap-2">
          {/* Grade Selector */}
          <select
            value={selectedGrade}
            onChange={(e) =>
              setSelectedGrade(
                e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
              )
            }
            className="px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">所有年级 (All Grades)</option>
            <option value={1}>小一 (Primary 1)</option>
            <option value={2}>小二 (Primary 2)</option>
            <option value={3}>小三 (Primary 3)</option>
            <option value={4}>小四 (Primary 4)</option>
            <option value={5}>小五 (Primary 5)</option>
            <option value={6}>小六 (Primary 6)</option>
          </select>

          {/* Term Selector */}
          <select
            value={selectedTerm}
            onChange={(e) =>
              setSelectedTerm(
                e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
              )
            }
            className="px-3 py-1.5 bg-amber-50/50 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">全学年 (All Terms)</option>
            <option value={1}>Term 1 (第一学段 / 上半学期)</option>
            <option value={2}>Term 2 (第二学段)</option>
            <option value={3}>Term 3 (第三学段 / 下半学期)</option>
            <option value={4}>Term 4 (第四学段)</option>
          </select>
        </div>
      </div>

      {/* Add New Week Button */}
      <button
        onClick={() => {
          setNumber(String(filteredWeeks.length + 1));
          setGrade(selectedGrade === "all" ? 4 : selectedGrade);
          setTerm(selectedTerm === "all" ? 1 : selectedTerm);
          setTitle(
            activeTab === "en"
              ? `Week ${filteredWeeks.length + 1}`
              : `第 ${filteredWeeks.length + 1} 课`
          );
          setShowCreateModal(true);
        }}
        className="w-full py-3 bg-white border border-dashed border-amber-300 rounded-2xl text-indigo-600 font-medium flex items-center justify-center gap-2 hover:bg-amber-50/50 transition mb-4 min-h-[48px]"
      >
        <Plus className="w-5 h-5" />
        新建{activeTab === "en" ? "英文" : "华文"}周次 / 单元
      </button>

      {/* Week Cards List */}
      <div className="space-y-3">
        {filteredWeeks.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl text-center text-gray-500 border border-amber-100">
            所选年级与学期下暂无{activeTab === "en" ? "英文" : "华文"}周次
          </div>
        ) : (
          filteredWeeks.map((w) => (
            <Link
              key={w.id}
              href={`/manage/week/${w.id}`}
              className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs flex items-center justify-between hover:border-amber-300 transition group"
            >
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-bold rounded-md">
                    小{w.grade || 3} / Term {w.term || 1}
                  </span>
                  <span className="font-bold text-slate-800 text-base">
                    第 {w.number} 周 — {w.title}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5">
                  <span>包含 {w.wordLists.length} 个词语</span>
                  {w.dictationDate && (
                    <span className="flex items-center gap-1 text-amber-700">
                      <Calendar className="w-3 h-3" />
                      {new Date(w.dictationDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDelete(e, w.id, w.title)}
                  className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition"
                  title="删除此周"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-600 transition" />
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Create Modal with Grade & Term Selectors */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-amber-100">
            <h3 className="text-lg font-bold mb-4">
              新建{activeTab === "en" ? "英文" : "华文"}练习周次
            </h3>

            {error && (
              <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    年级 (Grade)
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value={1}>小一 (P1)</option>
                    <option value={2}>小二 (P2)</option>
                    <option value={3}>小三 (P3)</option>
                    <option value={4}>小四 (P4)</option>
                    <option value={5}>小五 (P5)</option>
                    <option value={6}>小六 (P6)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    学期 (Term)
                  </label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-indigo-500 text-sm"
                  >
                    <option value={1}>Term 1 (上学期/段1)</option>
                    <option value={2}>Term 2 (段2)</option>
                    <option value={3}>Term 3 (下学期/段3)</option>
                    <option value={4}>Term 4 (段4)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  周次序号 (Number)
                </label>
                <input
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  标题 / 单元名称
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="例如: Week 6 (Unit 2)"
                  className="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  目标听写日期 (可选)
                </label>
                <input
                  type="date"
                  value={dictationDate}
                  onChange={(e) => setDictationDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? "保存中..." : "确认创建"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
