import Link from "next/link";
import { getWeeks } from "@/app/actions/manage";
import { Plus, BookOpen, FileText, ArrowLeft, Calendar, Trash2, Sparkles } from "lucide-react";
import ManageWeekList from "@/components/ManageWeekList";

export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const { weeks = [] } = await getWeeks();

  const zhWeeks = weeks.filter((w) => w.language === "zh");
  const enWeeks = weeks.filter((w) => w.language === "en");

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回主页
        </Link>
        <h1 className="text-xl font-bold text-slate-800">听写内容管理</h1>
        <div className="w-16" />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
        <Link
          href="/manage/phrases"
          className="bg-gradient-to-br from-violet-50 to-purple-50 p-4 rounded-2xl shadow-xs border border-violet-100 hover:border-violet-300 transition flex flex-col items-center justify-center text-center gap-2 group"
        >
          <div className="w-12 h-12 bg-violet-600 text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-violet-950 text-sm">Visual Phrase Bank</div>
            <div className="text-xs text-violet-700/80 mt-0.5">作文实用语块库管理</div>
          </div>
        </Link>

        <Link
          href="/manage/pdf-import"
          className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-2xl shadow-xs border border-indigo-100 hover:border-indigo-300 transition flex flex-col items-center justify-center text-center gap-2 group"
        >
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="font-bold text-indigo-950 text-sm">PDF 听写表 AI 导入</div>
            <div className="text-xs text-indigo-700/80 mt-0.5">上传试卷/听写表 PDF 自动识别入库</div>
          </div>
        </Link>

        <Link
          href="/manage/import"
          className="bg-white p-4 rounded-2xl shadow-xs border border-amber-100 hover:border-amber-300 transition flex flex-col items-center justify-center text-center gap-2 group"
        >
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">批量文本导入</div>
            <div className="text-xs text-gray-500 mt-0.5">粘贴多行词汇快速入库</div>
          </div>
        </Link>

        <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/50 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-12 h-12 bg-amber-100/80 text-amber-700 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="font-semibold text-slate-800 text-sm">当前已收录周数</div>
            <div className="text-xs text-amber-800 font-bold mt-0.5">
              华文 {zhWeeks.length} 周 / 英文 {enWeeks.length} 周
            </div>
          </div>
        </div>
      </div>

      {/* Week Management Sections */}
      <ManageWeekList initialZhWeeks={zhWeeks} initialEnWeeks={enWeeks} />
    </div>
  );
}
