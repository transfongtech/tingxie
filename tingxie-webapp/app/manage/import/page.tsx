import Link from "next/link";
import { getWeeks } from "@/app/actions/manage";
import { ArrowLeft } from "lucide-react";
import BulkImportClient from "@/components/BulkImportClient";

export default async function BulkImportPage() {
  const { weeks = [] } = await getWeeks();

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-3xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/manage"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回管理列表
        </Link>
        <h1 className="text-lg font-bold text-slate-800">批量文本导入词汇</h1>
        <div className="w-16" />
      </div>

      <BulkImportClient weeks={weeks} />
    </div>
  );
}
