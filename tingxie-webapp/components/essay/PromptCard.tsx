"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PenTool,
  CheckCircle2,
  Clock,
  Sparkles,
  MoreVertical,
  Pencil,
  Trash2,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { EssayPromptData } from "@/lib/essay-types";
import { updateEssayPrompt, deleteEssayPrompt } from "@/app/actions/essay";

export function PromptCard({ prompt }: { prompt: EssayPromptData }) {
  const router = useRouter();
  const hasSubmissions = prompt.submissionCount > 0;
  const coverImage = prompt.images.length > 0 ? prompt.images[0].imagePath : null;

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 编辑表单 State
  const [editTitle, setEditTitle] = useState(prompt.title);
  const [editDescription, setEditDescription] = useState(prompt.description || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 处理保存修改
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setErrorMsg("Topic title cannot be empty.");
      return;
    }

    setIsUpdating(true);
    setErrorMsg(null);

    try {
      const res = await updateEssayPrompt(prompt.id, editTitle, editDescription);
      if (!res.success) {
        throw new Error(res.error || "Failed to update topic");
      }
      setShowEditModal(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update topic.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 处理确认删除
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteEssayPrompt(prompt.id);
      if (!res.success) {
        throw new Error(res.error || "Failed to delete topic");
      }
      setShowDeleteModal(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to delete topic.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-amber-100/80 p-5 shadow-xs hover:shadow-md hover:border-violet-200 transition-all duration-200 flex flex-col justify-between h-full relative group">
        <div>
          {/* Top Image & Actions Header */}
          <div className="relative w-full h-40 bg-slate-100 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
            {coverImage ? (
              <img
                src={coverImage}
                alt={prompt.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <PenTool className="w-8 h-8 stroke-1" />
                <span className="text-xs">Picture Prompt</span>
              </div>
            )}

            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              {hasSubmissions ? (
                <span className="px-2.5 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-amber-500/90 text-white text-xs font-semibold rounded-full shadow-xs backdrop-blur-xs flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> New Topic
                </span>
              )}
            </div>

            {/* Manage Action Menu Button (Parent controls) */}
            <div className="absolute top-3 right-3 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-xs transition shadow-xs"
                title="Manage topic (Edit / Delete)"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div
                  className="absolute right-0 mt-1 w-36 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 text-xs font-medium z-20 animate-in fade-in zoom-in-95 duration-150"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowEditModal(true);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-amber-50 flex items-center gap-2 transition"
                  >
                    <Pencil className="w-3.5 h-3.5 text-indigo-600" /> Edit Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Topic
                  </button>
                </div>
              )}
            </div>
          </div>

          <Link href={`/essay/prompt/${prompt.id}`}>
            <h3 className="font-bold text-gray-900 text-lg hover:text-violet-600 transition-colors line-clamp-1">
              {prompt.title}
            </h3>
          </Link>

          {prompt.description && (
            <p className="text-gray-500 text-xs mt-1 line-clamp-2 leading-relaxed">
              {prompt.description}
            </p>
          )}
        </div>

        {/* Footer Score & CTA */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs">
            {prompt.latestScore !== null ? (
              <div className="flex items-center gap-1 font-semibold text-amber-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Latest: {prompt.latestScore}/36</span>
              </div>
            ) : (
              <span className="text-gray-400">Not attempted yet</span>
            )}
          </div>

          <Link href={`/essay/prompt/${prompt.id}`}>
            <span className="text-xs font-semibold text-violet-600 hover:translate-x-1 transition-transform flex items-center">
              {hasSubmissions ? "View / Retry →" : "Start Writing →"}
            </span>
          </Link>
        </div>
      </div>

      {/* Edit Details Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-amber-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-gray-900">Edit Topic Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Topic Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">
                  Instructions / Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating || !editTitle.trim()}
                  className="px-5 py-2 bg-violet-600 text-white rounded-xl font-bold text-xs hover:bg-violet-700 shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-amber-100 animate-in fade-in zoom-in-95 duration-150 text-center">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="font-bold text-base text-gray-900">Delete Topic?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Are you sure you want to delete <span className="font-bold text-gray-800">"{prompt.title}"</span>? All writing drafts and review history will be permanently deleted.
              </p>
            </div>

            <div className="flex justify-center gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 bg-red-600 text-white rounded-xl font-bold text-xs hover:bg-red-700 shadow-sm disabled:opacity-50 transition flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Delete Topic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
