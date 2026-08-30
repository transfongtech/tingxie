import Link from "next/link";
import { getPendingReviews } from "@/app/actions/practice-session";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import ParentReviewClient from "@/components/ParentReviewClient";

export default async function ParentReviewPage() {
  const { sessions = [] } = await getPendingReviews();

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/manage"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回管理列表
        </Link>
        <h1 className="text-lg font-bold text-slate-800">华文听写批改</h1>
        <div className="w-16" />
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl shadow-xs border border-amber-100 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">暂无待批改练习！</h2>
          <p className="text-gray-500 text-sm">
            George 完成华文纸上听写后，记录会自动在此处列出供您标记。
          </p>
        </div>
      ) : (
        <ParentReviewClient sessions={sessions} />
      )}
    </div>
  );
}
