import Link from "next/link";
import { notFound } from "next/navigation";
import { getWeekDetail } from "@/app/actions/manage";
import { ArrowLeft, BookOpen, Calendar } from "lucide-react";
import WeekDetailEditor from "@/components/WeekDetailEditor";

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const weekId = parseInt(resolvedParams.id, 10);
  if (isNaN(weekId)) notFound();

  const { week, success } = await getWeekDetail(weekId);
  if (!success || !week) notFound();

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/manage"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回列表
        </Link>
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
          {week.language === "en" ? "English Spelling" : "华文听写"}
        </span>
        <div className="w-16" />
      </div>

      {/* Week Title Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-amber-100 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              第 {week.number} 周 — {week.title}
            </h1>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5" />
              当前共有 {week.wordLists.length} 个练习词语
              {week.dictationDate && (
                <span className="flex items-center gap-1 text-amber-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 ml-2" />
                  听写日期: {new Date(week.dictationDate).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Editor Component */}
      <WeekDetailEditor week={week} />
    </div>
  );
}
