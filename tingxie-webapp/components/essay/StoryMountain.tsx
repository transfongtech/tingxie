"use client";

import { useState, useEffect, useRef } from "react";
import {
  Compass,
  MapPin,
  TrendingUp,
  Flag,
  Target,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface StoryMountainProps {
  promptId: number;
  images: { id: number; imagePath: string; sortOrder: number }[];
}

interface PlanningNotes {
  introduction: string;
  risingAction: string;
  resolution: string;
  conclusion: string;
}

export function StoryMountain({ promptId, images }: StoryMountainProps) {
  const localKey = `story_mountain_${promptId}`;

  const [notes, setNotes] = useState<PlanningNotes>({
    introduction: "",
    risingAction: "",
    resolution: "",
    conclusion: "",
  });

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<"saved" | "saving">("saved");
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null);

  // 1. 加载本地存储
  useEffect(() => {
    try {
      const stored = localStorage.getItem(localKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotes({
          introduction: parsed.introduction || "",
          risingAction: parsed.risingAction || "",
          resolution: parsed.resolution || "",
          conclusion: parsed.conclusion || "",
        });
      }
    } catch (e) {
      console.warn("Failed to load Story Mountain notes", e);
    }
  }, [localKey]);

  // 2. 防抖保存
  const handleChange = (field: keyof PlanningNotes, value: string) => {
    const updated = { ...notes, [field]: value };
    setNotes(updated);
    setSavedStatus("saving");

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
        setSavedStatus("saved");
      } catch (e) {
        console.warn("Failed to save Story Mountain notes", e);
      }
    }, 800);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all planning notes?")) {
      const empty = { introduction: "", risingAction: "", resolution: "", conclusion: "" };
      setNotes(empty);
      localStorage.removeItem(localKey);
      setSavedStatus("saved");
    }
  };

  const getImageForSection = (index: number) => {
    if (images && images.length > index) {
      return images[index].imagePath;
    }
    return null;
  };

  const filledCount = Object.values(notes).filter((val) => val.trim().length > 0).length;

  const sections: {
    key: keyof PlanningNotes;
    title: string;
    icon: React.ReactNode;
    description: string;
    image: string | null;
  }[] = [
    {
      key: "introduction",
      title: "Introduction",
      icon: <MapPin className="w-3.5 h-3.5 text-indigo-600" />,
      description: "Set the scene & characters",
      image: getImageForSection(0),
    },
    {
      key: "risingAction",
      title: "Rising Action",
      icon: <TrendingUp className="w-3.5 h-3.5 text-amber-600" />,
      description: "The main conflict or mishap",
      image: getImageForSection(1),
    },
    {
      key: "resolution",
      title: "Resolution",
      icon: <Flag className="w-3.5 h-3.5 text-emerald-600" />,
      description: "How the problem was solved",
      image: getImageForSection(2),
    },
    {
      key: "conclusion",
      title: "Conclusion",
      icon: <Target className="w-3.5 h-3.5 text-violet-600" />,
      description: "Lesson learned & reflection",
      image: null,
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-2xs text-slate-800 transition-all overflow-hidden">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-amber-50/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs text-slate-900">Story Mountain Plan</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100/70 text-amber-900">
                {filledCount}/4 Planned
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {isExpanded ? "Click to collapse" : "Click to expand & outline story"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 transition"
              title="Clear all notes"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="text-gray-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </div>

      {/* Image Zoom Modal */}
      {activeZoomImage && (
        <div
          onClick={() => setActiveZoomImage(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <img
            src={activeZoomImage}
            alt="Prompt Zoom"
            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Expanded Sections */}
      {isExpanded && (
        <div className="p-3 border-t border-amber-100/80 space-y-3 bg-amber-50/20 animate-in fade-in duration-150">
          {sections.map((sec) => (
            <div
              key={sec.key}
              className="p-2.5 rounded-xl bg-white border border-amber-100 shadow-2xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {sec.icon}
                  <span className="font-bold text-xs text-indigo-950">{sec.title}</span>
                </div>
                {sec.image && (
                  <button
                    type="button"
                    onClick={() => setActiveZoomImage(sec.image)}
                    className="group"
                    title="Click to zoom image"
                  >
                    <img
                      src={sec.image}
                      alt={sec.title}
                      className="w-10 h-7 object-cover rounded border border-amber-200 group-hover:scale-105 transition-transform"
                    />
                  </button>
                )}
              </div>

              <p className="text-[10px] text-gray-400">{sec.description}</p>

              <textarea
                value={notes[sec.key]}
                onChange={(e) => handleChange(sec.key, e.target.value)}
                placeholder="Keywords or sentences..."
                spellCheck={false}
                autoCorrect="off"
                className="w-full h-12 p-2 bg-amber-50/30 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500 resize-none font-sans leading-normal placeholder:text-gray-300"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
