"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Eye, Check, X, ArrowRight, ArrowLeft, Play } from "lucide-react";
import Link from "next/link";
import { logReview } from "@/app/actions/review";
import { cn } from "@/lib/utils";

interface Word {
  id: number;
  content: string;
  pinyin?: string | null;
}

interface PracticeSessionProps {
  weekId?: number;
  weekNumber: number;
  title?: string;
  words: Word[];
  language?: string; // "zh" or "en"
}

export function PracticeSession({
  weekNumber,
  title,
  words: initialWords,
  language = "zh",
}: PracticeSessionProps) {
  const [words] = useState(() => {
    const shuffled = [...initialWords];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  const [hasStarted, setHasStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [results, setResults] = useState<{ correct: number; wrong: number }>({
    correct: 0,
    wrong: 0,
  });

  const currentWord = words[currentIndex];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);

  const speakWord = (text: string) => {
    setAudioError(null);
    if (audioRef.current) {
      const newSrc = `/api/tts?text=${encodeURIComponent(text)}&lang=${language}`;
      if (!audioRef.current.src.endsWith(newSrc)) {
        audioRef.current.src = newSrc;
      }
      audioRef.current.play().catch((e) => {
        if (e.name === "AbortError" || e.message.includes("interrupted")) {
          return;
        }
        console.error("Audio play failed", e);
        setAudioError(e.message);
      });
    }
  };

  useEffect(() => {
    if (hasStarted && currentWord && !isFinished) {
      const t = setTimeout(() => speakWord(currentWord.content), 300);
      return () => clearTimeout(t);
    }
  }, [hasStarted, currentIndex, isFinished]);

  const handleStart = () => {
    setHasStarted(true);
  };

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleResult = async (correct: boolean) => {
    setResults((prev) => ({
      correct: prev.correct + (correct ? 1 : 0),
      wrong: prev.wrong + (correct ? 0 : 1),
    }));

    await logReview(currentWord.id, correct);

    if (currentIndex < words.length - 1) {
      setIsRevealed(false);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  if (words.length === 0) {
    return (
      <div className="text-center p-8 bg-[#FBF7F0] min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">没有找到待练习词语。</h2>
        <Link href="/" className="text-indigo-600 underline">
          返回主界面
        </Link>
      </div>
    );
  }

  // Pre-start Landing Page to unlock AudioContext
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <Play className="w-10 h-10 fill-current ml-1" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {weekNumber > 0 ? `第 ${weekNumber} 周听写练习` : title || "听写练习"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          准备好了吗？点击下方按钮开启练习，共 {words.length} 个单词。
        </p>

        <button
          onClick={handleStart}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-sm transition min-h-[52px] flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          开始练习 (Start)
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-xs border border-amber-100 mt-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">练习完成！🎉</h2>

        <div className="flex justify-between items-center mb-8">
          <Link
            href="/"
            className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-amber-50 rounded-full transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {weekNumber > 0 ? `Week ${weekNumber}` : title}
          </div>
          <div className="text-sm font-bold text-gray-500">
            {words.length} / {words.length}
          </div>
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-emerald-600">
            <div className="text-4xl font-bold">{results.correct}</div>
            <div className="text-xs font-semibold uppercase mt-1">正确</div>
          </div>
          <div className="text-amber-600">
            <div className="text-4xl font-bold">{results.wrong}</div>
            <div className="text-xs font-semibold uppercase mt-1">需再练习</div>
          </div>
        </div>

        <Link
          href="/"
          className="inline-block px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
        >
          返回主页面板 →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen flex flex-col select-none bg-[#FBF7F0]">
      <header className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition"
        >
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="text-sm font-semibold text-gray-500">
          {weekNumber > 0 ? `第 ${weekNumber} 周` : title} • {currentIndex + 1} /{" "}
          {words.length}
        </div>
        <div className="w-6" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">
        {/* Audio Button */}
        <button
          onClick={() => speakWord(currentWord.content)}
          className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 hover:bg-indigo-200 transition shadow-xs active:scale-95"
        >
          <Volume2 className="w-10 h-10" />
        </button>

        {/* Word Display Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mb-8">
          <AnimatePresence mode="wait">
            {!isRevealed ? (
              <motion.div
                key="hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-gray-400 font-medium text-lg italic h-48 flex items-center justify-center"
              >
                {language === "zh"
                  ? "请在纸上手写对应的汉字..."
                  : "Listen carefully and type your spelling..."}
              </motion.div>
            ) : (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center w-full bg-white p-8 rounded-3xl border border-amber-100 shadow-xs"
              >
                {currentWord.pinyin && language === "zh" && (
                  <div className="text-xl md:text-2xl text-gray-400 font-medium mb-3 font-mono">
                    {currentWord.pinyin}
                  </div>
                )}
                <div
                  className={cn(
                    "text-slate-900",
                    language === "zh"
                      ? "font-kaiti font-normal"
                      : "font-sans font-bold",
                    currentWord.content.length > 5
                      ? "text-3xl md:text-4xl"
                      : "text-5xl md:text-6xl"
                  )}
                >
                  {currentWord.content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="w-full max-w-sm space-y-4">
          <audio ref={audioRef} className="hidden" />

          {audioError && (
            <div className="text-amber-800 text-xs text-center bg-amber-50 p-2 rounded-xl border border-amber-200">
              语音播放提示: {audioError}
            </div>
          )}

          {!isRevealed ? (
            <button
              onClick={handleReveal}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-xs min-h-[50px]"
            >
              <Eye className="w-5 h-5" />
              查看正确答案
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleResult(false)}
                className="py-4 bg-amber-100 text-amber-900 border border-amber-200 rounded-2xl font-bold text-lg hover:bg-amber-200 transition flex items-center justify-center gap-2 min-h-[50px]"
              >
                <X className="w-5 h-5" />
                写错了 / 需练习
              </button>
              <button
                onClick={() => handleResult(true)}
                className="py-4 bg-emerald-500 text-white border border-emerald-600 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition flex items-center justify-center gap-2 shadow-xs min-h-[50px]"
              >
                <Check className="w-5 h-5" />
                写对了！
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
