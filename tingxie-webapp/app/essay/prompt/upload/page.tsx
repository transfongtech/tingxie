"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createEssayPrompt } from "@/app/actions/essay";
import { ArrowLeft, Upload, Image as ImageIcon, CheckCircle, Loader2, Plus, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { ImageCropModal } from "@/components/essay/ImageCropModal";

export default function UploadPromptPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleCropped = (blob: Blob) => {
    if (editingIndex === null) return;
    const newFile = new File([blob], files[editingIndex].name || "enhanced_prompt.jpg", {
      type: "image/jpeg",
    });
    const updatedFiles = [...files];
    updatedFiles[editingIndex] = newFile;
    setFiles(updatedFiles);

    const newUrl = URL.createObjectURL(blob);
    const updatedPreviews = [...previews];
    updatedPreviews[editingIndex] = newUrl;
    setPreviews(updatedPreviews);

    setEditingIndex(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const newFiles = [...files, ...selectedFiles].slice(0, 4); // 最多 4 张图片
      setFiles(newFiles);

      // 生成本地预览
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setPreviews(newPreviews);
    }
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    setPreviews(updatedPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg("Please enter a title for the composition topic.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const imagePaths: string[] = [];

      // 1. 上传所有图片到服务器
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/essay/prompt-image", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Failed to upload prompt image");
        }

        const data = await res.json();
        if (data.imagePath) {
          imagePaths.push(data.imagePath);
        }
      }

      // 2. 创建 EssayPrompt
      const createRes = await createEssayPrompt(title, description, imagePaths);
      if (!createRes.success) {
        throw new Error(createRes.error || "Failed to save composition prompt");
      }

      router.push("/essay");
      router.refresh();
    } catch (err: any) {
      console.error("Error creating prompt:", err);
      setErrorMsg(err.message || "Failed to create prompt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 text-[#2D2D2D]">
      <div className="flex items-center gap-3">
        <Link
          href="/essay"
          className="p-2.5 bg-white border border-amber-100 rounded-xl hover:bg-amber-50 text-gray-600 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload New Topic (Parents)</h1>
          <p className="text-gray-500 text-xs mt-0.5">
            Upload composition exam papers or picture prompts. Images will be preserved in high quality for reference during writing.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 md:p-8 border border-amber-100 shadow-xs space-y-6">
        {errorMsg && (
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm">
            {errorMsg}
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Topic Title <span className="text-amber-600">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. A Day at the Park / An Unforgettable Experience"
            className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium"
            required
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">
            Additional Instructions (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Write a story of at least 150 words based on the pictures provided..."
            className="w-full px-4 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 min-h-[90px] text-sm"
          />
        </div>

        {/* Image Upload Area */}
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-900">
            Picture Prompts (up to 4 images)
          </label>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previews.map((src, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 group">
                <img src={src} alt={`Prompt ${index + 1}`} className="w-full h-full object-cover" />
                
                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                  title="Remove this image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Enhance & Crop Button */}
                <button
                  type="button"
                  onClick={() => setEditingIndex(index)}
                  className="absolute bottom-2 left-2 right-2 py-1 px-2 bg-black/70 hover:bg-black/80 text-white rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 backdrop-blur-xs transition"
                  title="Crop, rotate, and enhance photo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Enhance / Crop
                </button>
              </div>
            ))}

            {files.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl hover:border-violet-400 hover:bg-violet-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-gray-600">Take Photo / Choose</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
          <Link href="/essay">
            <button
              type="button"
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-6 py-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 font-medium text-sm flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Save & Publish Topic
              </>
            )}
          </button>
        </div>
      </form>

      {/* Image Crop & Scan Enhancer Modal */}
      {editingIndex !== null && previews[editingIndex] && (
        <ImageCropModal
          imageSrc={previews[editingIndex]}
          onConfirm={handleCropped}
          onCancel={() => setEditingIndex(null)}
        />
      )}
    </main>
  );
}
