"use client";

import { useState } from "react";
import { StoryMountain } from "./StoryMountain";
import { PhraseBank } from "./PhraseBank";
import { Compass, BookOpen } from "lucide-react";

interface WritingSidebarProps {
  promptId: number;
  images: { id: number; imagePath: string; sortOrder: number }[];
  onInsertPhrase?: (phrase: string) => void;
}

export function WritingSidebar({ promptId, images, onInsertPhrase }: WritingSidebarProps) {
  const [activeTab, setActiveTab] = useState<"phrases" | "plan">("phrases");

  return (
    <div className="space-y-3">
      {/* Tab Switcher */}
      <div className="flex bg-amber-100/50 p-1 rounded-2xl border border-amber-200/50">
        <button
          onClick={() => setActiveTab("phrases")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "phrases"
              ? "bg-white text-indigo-700 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Phrase Bank</span>
        </button>

        <button
          onClick={() => setActiveTab("plan")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "plan"
              ? "bg-white text-indigo-700 shadow-2xs"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Story Mountain Plan</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "plan" ? (
        <StoryMountain promptId={promptId} images={images} />
      ) : (
        <PhraseBank onInsertPhrase={onInsertPhrase} />
      )}
    </div>
  );
}
