"use client";

import { PracticeSession } from "@/components/PracticeSession";
import SpellingPractice from "@/components/SpellingPractice";
import { useState, useCallback, useRef } from "react";
import { Sparkles, Play, Pause, Loader2, X } from "lucide-react";

interface Word {
  id: number;
  content: string;
  pinyin?: string | null;
}

interface PageProps {
  words: Word[];
  language?: string;
}

/**
 * 将故事文本中的《词语》标记渲染为高亮 span
 */
function renderStory(text: string): React.ReactNode[] {
  const parts = text.split(/(《[^》]+》)/g);
  return parts.map((part, i) => {
    const match = part.match(/^《(.+)》$/);
    if (match) {
      return (
        <span
          key={i}
          className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100"
        >
          {match[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function DueClient({ words, language = "zh" }: PageProps) {
  const [story, setStory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const generateStory = async () => {
    setIsLoading(true);
    try {
      const vocab = words.filter((w) => w.content.length <= 8).map((w) => w.content);
      const selected = vocab.sort(() => 0.5 - Math.random()).slice(0, 10);

      if (selected.length === 0) {
        alert("没有合适的词语来生成故事。");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/story/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selected, language }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || res.statusText);
      }

      if (data.story) {
        setStory(data.story);
      } else {
        throw new Error("No story returned from API");
      }
    } catch (e: any) {
      console.error("Generate Story Client Error:", e);
      alert("故事生成失败：" + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAudio = async () => {
    if (!story) return;

    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    setIsAudioLoading(true);
    try {
      const cleanText = story.replace(/[《》]/g, "");
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, lang: language }),
      });

      if (!res.ok) throw new Error("TTS fetch failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);

      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("High-quality TTS playback failed:", err);
      alert("语音朗读加载失败，请稍后重试");
    } finally {
      setIsAudioLoading(false);
    }
  };

  const closeStory = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setStory(null);
  };

  return (
    <div className="relative">
      {/* Story Modal */}
      {story && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-[#FBF7F0] rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative border border-amber-100/90">
            <button
              onClick={closeStory}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-amber-100/50 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-extrabold mb-5 flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-6 h-6 text-indigo-500" />
              {language === "zh" ? "词语小故事 (Yarn a Story)" : "Creative Story (Yarn a Story)"}
            </h2>

            <div className="prose prose-lg text-[#2D2D2D] leading-relaxed whitespace-pre-wrap mb-8 font-medium bg-white p-5 md:p-6 rounded-2xl border border-amber-100/80 shadow-2xs">
              {renderStory(story)}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={toggleAudio}
                disabled={isAudioLoading}
                className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isAudioLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> 加载高品质语音...
                  </>
                ) : isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" /> 暂停播放
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" /> 高品质朗读 ✨
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      {!story && words.length > 0 && (
        <button
          onClick={generateStory}
          disabled={isLoading}
          className="fixed bottom-6 right-6 z-40 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full font-bold shadow-lg shadow-violet-200 hover:scale-105 transition-all flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {language === "zh" ? "编个故事 (Yarn a Story)" : "Yarn a Story"}
        </button>
      )}

      {language === "en" ? (
        <SpellingPractice weekNumber={0} title="记忆曲线练习 (Due Spelling Review)" words={words} />
      ) : (
        <PracticeSession weekNumber={0} title="今日待复习" words={words} language={language} />
      )}
    </div>
  );
}
