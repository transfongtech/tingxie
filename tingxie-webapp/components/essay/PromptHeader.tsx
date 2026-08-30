"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Check, X, Loader2, History } from "lucide-react";
import { updateEssayPrompt } from "@/app/actions/essay";

interface PromptHeaderProps {
  promptId: number;
  initialTitle: string;
  initialDescription?: string | null;
  pastSubmissionsCount: number;
  latestSubmissionId?: number | null;
}

export function PromptHeader({
  promptId,
  initialTitle,
  initialDescription,
  pastSubmissionsCount,
  latestSubmissionId,
}: PromptHeaderProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    setIsSaving(true);
    try {
      const res = await updateEssayPrompt(promptId, title.trim(), initialDescription || undefined);
      if (!res.success) {
        throw new Error(res.error || "Failed to update title");
      }
      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      alert(err.message || "Failed to update title");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTitle(initialTitle);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/essay"
          className="p-2.5 bg-white border border-amber-100 rounded-xl hover:bg-amber-50 text-gray-600 transition-colors shadow-xs"
          title="Back to topics"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>

        <div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="px-3 py-1 bg-white border-2 border-indigo-500 rounded-xl text-lg md:text-xl font-bold text-gray-900 focus:outline-none shadow-xs"
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                title="Save title"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setTitle(initialTitle);
                }}
                className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                {title}
              </h1>
              <button
                type="button"
                className="p-1 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition"
                title="Click to edit topic title"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}

          <p className="text-gray-500 text-xs mt-0.5">
            Primary School Composition Practice • Autosafe enabled
          </p>
        </div>
      </div>

      {pastSubmissionsCount > 0 && latestSubmissionId && (
        <Link href={`/essay/submission/${latestSubmissionId}`}>
          <button className="px-3.5 py-2 bg-white border border-amber-200 text-violet-700 rounded-xl hover:bg-violet-50 font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors">
            <History className="w-4 h-4" /> View Past Reviews ({pastSubmissionsCount})
          </button>
        </Link>
      )}
    </div>
  );
}
