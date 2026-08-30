"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, CheckCircle, Play, Plus, Filter } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WeekData {
  id: number;
  number: number;
  grade: number;
  term: number;
  title: string;
  wordCount: number;
  completed: number;
  isActive: boolean;
  language: string;
}

interface WeeklyPracticeProps {
  weeks: WeekData[];
  handwritingMode?: boolean;
}

export function WeeklyPractice({ weeks }: WeeklyPracticeProps) {
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all");
  const [selectedTerm, setSelectedTerm] = useState<number | "all">("all");

  const filteredWeeks = weeks.filter((w) => {
    if (w.number === 0) return false; // 排除作文专属 Bucket
    if (selectedGrade !== "all" && (w.grade || 3) !== selectedGrade) return false;
    if (selectedTerm !== "all" && (w.term || 1) !== selectedTerm) return false;
    return true;
  });

  if (weeks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xs border border-amber-100 p-8 text-center">
        <BookOpen className="w-12 h-12 text-amber-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">暂无练习周次</h3>
        <p className="text-gray-500 mt-1 mb-4 text-sm">
          点击按钮在家长管理后台创建周次并录入词汇。
        </p>
        <Link href="/manage">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium text-sm inline-flex items-center gap-2 hover:bg-indigo-700 transition">
            <Plus className="w-4 h-4" />
            新建周次
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-amber-100 overflow-hidden">
      <div className="p-6 border-b border-amber-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            每周练习单元 (Weekly Units)
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            选择课程单元开启专门听写与 Spelling 练习
          </p>
        </div>

        {/* Dashboard Grade & Term Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            切换:
          </div>

          <select
            value={selectedGrade}
            onChange={(e) =>
              setSelectedGrade(
                e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
              )
            }
            className="px-3 py-1.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">所有年级</option>
            <option value={1}>小一 (P1)</option>
            <option value={2}>小二 (P2)</option>
            <option value={3}>小三 (P3)</option>
            <option value={4}>小四 (P4)</option>
            <option value={5}>小五 (P5)</option>
            <option value={6}>小六 (P6)</option>
          </select>

          <select
            value={selectedTerm}
            onChange={(e) =>
              setSelectedTerm(
                e.target.value === "all" ? "all" : parseInt(e.target.value, 10)
              )
            }
            className="px-3 py-1.5 bg-amber-50/60 border border-amber-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="all">全学年</option>
            <option value={1}>Term 1 (段1)</option>
            <option value={2}>Term 2 (段2)</option>
            <option value={3}>Term 3 (段3)</option>
            <option value={4}>Term 4 (段4)</option>
          </select>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWeeks.length === 0 ? (
          <div className="col-span-full py-8 text-center text-gray-400 text-sm">
            所选年级/学期下暂无练习单元，请在顶部选择“所有年级”。
          </div>
        ) : (
          filteredWeeks.map((week) => (
            <motion.div
              key={week.id}
              whileHover={{ y: -2 }}
              className={cn(
                "p-5 rounded-2xl border transition-all relative overflow-hidden group bg-white",
                week.isActive
                  ? "border-indigo-300 bg-indigo-50/30"
                  : "border-amber-100 hover:border-indigo-200 hover:shadow-sm"
              )}
            >
              {week.isActive && (
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-2.5 py-0.5 rounded-bl-lg font-bold">
                  当前活跃
                </div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg">
                    {week.number}
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-[11px] font-bold rounded-md">
                    小{week.grade || 3} T{week.term || 1}
                  </span>
                </div>

                {week.completed > 0 && (
                  <div className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/50">
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    {week.completed}%
                  </div>
                )}
              </div>

              <h3 className="font-bold text-slate-900 mb-1 text-base">
                {week.title}
              </h3>
              <p className="text-xs text-gray-500 mb-4">{week.wordCount} 个词语</p>

              <Link href={`/practice/${week.id}?lang=${week.language}`} className="block">
                <button className="w-full py-2.5 bg-amber-50/50 border border-amber-200 text-indigo-600 rounded-xl text-sm font-semibold group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition flex items-center justify-center gap-2 min-h-[44px]">
                  <Play className="w-4 h-4 fill-current" />
                  开始练习 →
                </button>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
