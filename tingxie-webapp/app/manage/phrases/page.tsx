import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Sparkles, BookOpen } from "lucide-react";
import ManagePhrasesClient from "./ManagePhrasesClient";

export const dynamic = "force-dynamic";

export default async function ManagePhrasesPage() {
  const phrases = await prisma.phrase.findMany({
    where: { language: "en" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href="/manage"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回后台
        </Link>
        <h1 className="text-xl font-bold text-slate-800">Visual Phrase Bank 语块管理</h1>
        <div className="w-16" />
      </div>

      {/* Client Management Component */}
      <ManagePhrasesClient initialPhrases={phrases} />
    </div>
  );
}
