"use client";

import { Volume2, CheckCircle2, Play } from "lucide-react";
import { SyllableData } from "@/lib/syllable";
import { useRef } from "react";

interface SyllableBreakdownProps {
  wordContent: string;
  userAttempt: string;
  syllableData: SyllableData | null;
  onDismiss: () => void;
}

export default function SyllableBreakdown({
  wordContent,
  userAttempt,
  syllableData,
  onDismiss,
}: SyllableBreakdownProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 原生 Google 高品质慢速 TTS（自然延伸元音，完全无电音变调怪异失真）
  const speakWholeWordSlowly = () => {
    const ttsUrl = `/api/tts?text=${encodeURIComponent(wordContent.trim())}&lang=en&slow=true`;
    
    if (audioRef.current) {
      audioRef.current.src = ttsUrl;
      audioRef.current.play().catch((e) => {
        if (e.name === "AbortError") return;
        console.warn("API Slow TTS play failed, fallback:", e);
        fallbackSpeechSynthesis(wordContent, 0.8);
      });
    } else {
      const audio = new Audio(ttsUrl);
      audioRef.current = audio;
      audio.play().catch(() => fallbackSpeechSynthesis(wordContent, 0.8));
    }
  };

  // 单音节朗读
  const speakSyllable = (syllableText: string) => {
    const ttsUrl = `/api/tts?text=${encodeURIComponent(syllableText.trim())}&lang=en&slow=true`;
    const audio = new Audio(ttsUrl);
    audio.play().catch(() => fallbackSpeechSynthesis(syllableText, 0.85));
  };

  const fallbackSpeechSynthesis = (text: string, rate: number) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = rate;
      window.speechSynthesis.speak(utterance);
    }
  };

  const syllables = syllableData?.syllableList || [wordContent];

  return (
    <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-6 shadow-xs max-w-md mx-auto text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
      <audio ref={audioRef} className="hidden" />

      <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
        🧩 音节拆解与规律辅助 (Syllable Scaffolding)
      </div>

      {/* Syllables & Phonetic Display (Clickable for Syllable Speech) */}
      <div>
        <div className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-wider mb-1 flex items-center justify-center gap-2 flex-wrap">
          {syllables.map((syl, i) => (
            <span key={i} className="flex items-center">
              <button
                type="button"
                onClick={() => speakSyllable(syl)}
                className="bg-white px-3.5 py-1.5 rounded-xl shadow-2xs border border-amber-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-indigo-900 transition flex items-center gap-1 group cursor-pointer"
                title={`点击发音: ${syl}`}
              >
                <span>{syl}</span>
                <Play className="w-3 h-3 text-indigo-400 opacity-60 group-hover:opacity-100 group-hover:scale-110 transition" />
              </button>
              {i < syllables.length - 1 && (
                <span className="mx-1 text-amber-400 font-bold">·</span>
              )}
            </span>
          ))}
        </div>

        {syllableData?.phonetic && (
          <div className="text-sm font-mono text-gray-500 mt-2">
            音标: {syllableData.phonetic}
          </div>
        )}
      </div>

      {/* Slow Pronunciation Button */}
      <button
        onClick={speakWholeWordSlowly}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg transition active:scale-95 min-h-[48px]"
      >
        <Volume2 className="w-5 h-5 text-white" />
        🔊 高品质慢速朗读 (High-Quality Slow Speech)
      </button>

      {/* Comparison View */}
      <div className="bg-white p-5 rounded-2xl border border-amber-200 text-left text-base space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-gray-500">你的拼写:</span>
          <span className="font-mono text-amber-800 font-bold line-through text-lg">
            {userAttempt || "(空白)"}
          </span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-gray-500">正确拼写:</span>
          <span className="font-mono text-emerald-700 font-extrabold text-xl">
            {wordContent}
          </span>
        </div>
        {syllableData?.notes && (
          <div className="pt-3 border-t border-gray-100 text-slate-600 text-sm leading-relaxed">
            💡 {syllableData.notes}
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <button
        onClick={onDismiss}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-xs transition flex items-center justify-center gap-2 min-h-[48px]"
      >
        <CheckCircle2 className="w-4 h-4" />
        我记住了，继续下一个 (Continue)
      </button>
    </div>
  );
}
