"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle2, Loader2, Sparkles, Layers } from "lucide-react";

export default function PdfImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [grade, setGrade] = useState("4");
  const [term, setTerm] = useState("2");
  const [language, setLanguage] = useState("zh");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState<any[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setResultData(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("请选择 PDF 文件");
      return;
    }

    setLoading(true);
    setError("");
    setResultData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("grade", grade);
      formData.append("term", term);
      formData.append("language", language);

      const res = await fetch("/api/tingxie/import-pdf", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "识别 PDF 失败");
      }

      setResultData(data.data);
    } catch (err: any) {
      console.error("PDF upload error:", err);
      setError(err.message || "解析与导入过程出错");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-4 sm:p-6 max-w-4xl mx-auto pb-24 space-y-6">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/manage"
          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 px-3 bg-white rounded-xl shadow-xs border border-amber-100/60"
        >
          <ArrowLeft className="w-4 h-4" />
          返回管理后台
        </Link>
        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          <Sparkles className="w-4 h-4" /> AI 试卷/表单 PDF OCR
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-amber-100 shadow-xs space-y-6">
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">上传听写/默写表 PDF 并自动导入</h1>
          <p className="text-xs text-gray-500 mt-1">
            上传扫码或电子版 PDF，系统将使用 AI 自动识别“听写”与“默写”单元并结构化写入数据库。
          </p>
        </div>

        {/* Grade / Term / Language Config */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50/40 rounded-2xl border border-amber-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">目标年级 (Grade)</label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
            >
              <option value="1">Primary 1 (一年级)</option>
              <option value="2">Primary 2 (二年级)</option>
              <option value="3">Primary 3 (三年级)</option>
              <option value="4">Primary 4 (四年级)</option>
              <option value="5">Primary 5 (五年级)</option>
              <option value="6">Primary 6 (六年级)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">学期 (Term)</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
            >
              <option value="1">Term 1 (Semester 1)</option>
              <option value="2">Term 2 (Semester 1)</option>
              <option value="3">Term 3 (Semester 2)</option>
              <option value="4">Term 4 (Semester 2)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">科目语言</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium"
            >
              <option value="zh">华文/中文 (Chinese)</option>
              <option value="en">英文 (English)</option>
            </select>
          </div>
        </div>

        {/* PDF File Dropzone */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">PDF 文件上传</label>
          <label className="border-2 border-dashed border-amber-200 hover:border-indigo-400 bg-amber-50/20 hover:bg-indigo-50/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            {file ? (
              <div>
                <span className="font-bold text-slate-800 text-sm">{file.name}</span>
                <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div>
                <span className="font-bold text-slate-800 text-sm">点击或拖拽 PDF 文件到此处</span>
                <p className="text-xs text-gray-400 mt-1">支持包含听写/默写词汇表的扫描版或电子版 PDF</p>
              </div>
            )}
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {error && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-xl">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base rounded-2xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[50px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> AI 多页视觉扫描解析与导入中...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> 开始 AI 自动识别并入库
            </>
          )}
        </button>
      </div>

      {/* Parse Result Display */}
      {resultData && resultData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-emerald-50 pb-4">
            <h2 className="text-base font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              识别与导入成功！共写入 {resultData.length} 个单元
            </h2>
            <Link
              href="/tingxie"
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              前往听写练习列表 →
            </Link>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {resultData.map((unit: any, idx: number) => (
              <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800 text-sm">{unit.title}</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold">
                    {unit.items?.length || 0} 个条目
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {unit.items?.map((item: string, i: number) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
