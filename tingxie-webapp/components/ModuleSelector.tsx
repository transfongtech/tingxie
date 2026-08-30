"use client";

import Link from "next/link";
import { BookOpen, PenTool, ArrowRight, Sparkles, CheckCircle2, Clock, Award } from "lucide-react";

interface HubStats {
  tingxieDue: number;
  tingxieMastered: number;
  essayCount: number;
  latestScore: number | null;
  avgScore: number | null;
}

export function ModuleSelector({ stats }: { stats: HubStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto pt-4">
      {/* Module 1: Tingxie & Spelling Practice */}
      <Link href="/tingxie" className="group block">
        <div className="h-full bg-white rounded-3xl p-8 border border-amber-100/80 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group-hover:-translate-y-1">
          {/* Subtle gradient accent background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100/40 to-amber-100/30 rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <BookOpen className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200/50">
                华文与英文单字
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              听写与 Spelling 练习
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              基于科学记忆曲线的词汇巩固，支持语音自动朗读与智能听写。
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <div className="font-bold text-gray-900 text-sm">{stats.tingxieDue}</div>
                  <div className="text-gray-500">今日需复习</div>
                </div>
              </div>

              <div className="bg-emerald-50/50 p-3 rounded-xl flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-emerald-900 text-sm">{stats.tingxieMastered}</div>
                  <div className="text-emerald-700">已掌握单词</div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-sm font-semibold text-indigo-600 group-hover:text-indigo-700 pt-1">
              <span>进入听写练习</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>

      {/* Module 2: English Composition Practice */}
      <Link href="/essay" className="group block">
        <div className="h-full bg-white rounded-3xl p-8 border border-amber-100/80 shadow-sm hover:shadow-xl hover:border-violet-200 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group-hover:-translate-y-1">
          {/* Subtle gradient accent background */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-100/40 to-pink-100/30 rounded-bl-full -mr-8 -mt-8 pointer-events-none transition-transform group-hover:scale-110" />

          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shadow-xs group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                <PenTool className="w-8 h-8" />
              </div>
              <span className="px-3 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-full border border-violet-200/50 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-500" /> PSLE 36分制
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 group-hover:text-violet-600 transition-colors">
              Composition Practice
            </h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              英文作文打字练习，AI 智能细致批改，范文多维度提升与全闭环拼写自动导入。
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl flex items-center gap-2.5">
                <PenTool className="w-4 h-4 text-violet-500 shrink-0" />
                <div>
                  <div className="font-bold text-gray-900 text-sm">{stats.essayCount} 篇</div>
                  <div className="text-gray-500">已完成作文</div>
                </div>
              </div>

              <div className="bg-amber-50/50 p-3 rounded-xl flex items-center gap-2.5">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-amber-900 text-sm">
                    {stats.latestScore !== null ? `${stats.latestScore}/36` : "暂无"}
                  </div>
                  <div className="text-amber-700">最新得分</div>
                </div>
              </div>
            </div>

            <div className="flex items-center text-sm font-semibold text-violet-600 group-hover:text-violet-700 pt-1">
              <span>进入作文练习</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
