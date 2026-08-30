"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowLeft, Play, ArrowRight, RotateCcw } from "lucide-react";
import Link from "next/link";
import { logReview } from "@/app/actions/review";
import { fetchSyllableScaffolding } from "@/app/actions/syllable";
import { SyllableData } from "@/lib/syllable";
import SyllableBreakdown from "./SyllableBreakdown";
import {
  CORRECT_FEEDBACKS,
  RETRY_FEEDBACKS,
  BREAKDOWN_FEEDBACKS,
  getRandomFeedback,
} from "@/lib/encouragement";

interface Word {
  id: number;
  content: string;
}

interface SpellingPracticeProps {
  weekId?: number;
  weekNumber: number;
  title?: string;
  words: Word[];
}

export default function SpellingPractice({
  weekNumber,
  title,
  words: initialWords,
}: SpellingPracticeProps) {
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
  const [userInput, setUserInput] = useState("");
  const [attempts, setAttempts] = useState(0); // 0 = first attempt, 1 = second attempt
  const [status, setStatus] = useState<"idle" | "correct" | "retry" | "breakdown">("idle");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [syllableData, setSyllableData] = useState<SyllableData | null>(null);
  const [loadingScaffolding, setLoadingScaffolding] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentWord = words[currentIndex];

  const speakWord = (text: string, slow = false) => {
    if (!text) return;

    // 优先使用高质量的 /api/tts 服务端地道发音 (支持原生慢速慢读)
    const ttsUrl = `/api/tts?text=${encodeURIComponent(text.trim())}&lang=en${slow ? "&slow=true" : ""}`;
    if (audioRef.current) {
      audioRef.current.src = ttsUrl;
      audioRef.current.play().catch((e) => {
        if (e.name === "AbortError") return;
        console.warn("API Audio play failed, falling back to browser synthesis:", e);
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "en-US";
          utterance.rate = slow ? 0.75 : 0.9;
          window.speechSynthesis.speak(utterance);
        }
      });
    } else if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = slow ? 0.75 : 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    if (hasStarted && currentWord && !isFinished) {
      const timer = setTimeout(() => speakWord(currentWord.content), 200);
      if (inputRef.current) {
        inputRef.current.focus();
      }
      return () => clearTimeout(timer);
    }
  }, [hasStarted, currentIndex, isFinished]);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || status === "correct" || status === "breakdown") return;

    const isCorrect =
      userInput.trim().toLowerCase() === currentWord.content.trim().toLowerCase();

    if (isCorrect) {
      setStatus("correct");
      setFeedbackMsg(getRandomFeedback(CORRECT_FEEDBACKS));
      setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
      await logReview(currentWord.id, true);
    } else {
      if (attempts === 0) {
        // First error -> retry chance
        setAttempts(1);
        setStatus("retry");
        setFeedbackMsg(getRandomFeedback(RETRY_FEEDBACKS));
        speakWord(currentWord.content); // Re-play audio on retry
      } else {
        // Second error -> trigger Syllable Breakdown
        setStatus("breakdown");
        setFeedbackMsg(getRandomFeedback(BREAKDOWN_FEEDBACKS));
        setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        setLoadingScaffolding(true);

        const res = await fetchSyllableScaffolding(currentWord.id, currentWord.content);
        if (res.success && res.data) {
          setSyllableData(res.data);
        }
        setLoadingScaffolding(false);
        await logReview(currentWord.id, false);
      }
    }
  };

  const handleNextWord = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setUserInput("");
      setAttempts(0);
      setStatus("idle");
      setFeedbackMsg("");
      setSyllableData(null);
    } else {
      setIsFinished(true);
    }
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-[#FBF7F0] text-[#2D2D2D] p-6 flex flex-col items-center justify-center max-w-md mx-auto text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xs">
          <Play className="w-10 h-10 fill-current ml-1" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {weekNumber > 0 ? `Week ${weekNumber} Spelling` : title || "English Spelling"}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          准备好键盘拼写了吗？点击下方按钮开启练习，共 {words.length} 个单词。
        </p>

        <button
          onClick={() => setHasStarted(true)}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg shadow-xs transition flex items-center justify-center gap-2 min-h-[52px]"
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
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Spelling Finished! 🎉</h2>

        <div className="flex justify-between items-center mb-8 text-xs font-bold text-gray-400 uppercase">
          <span>{weekNumber > 0 ? `Week ${weekNumber}` : title}</span>
          <span>{words.length} Words</span>
        </div>

        <div className="flex justify-center gap-8 mb-8">
          <div className="text-emerald-600">
            <div className="text-4xl font-bold">{stats.correct}</div>
            <div className="text-xs font-semibold uppercase mt-1">正确</div>
          </div>
          <div className="text-amber-600">
            <div className="text-4xl font-bold">{stats.wrong}</div>
            <div className="text-xs font-semibold uppercase mt-1">需加练</div>
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
    <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen flex flex-col bg-[#FBF7F0] text-[#2D2D2D]">
      <header className="flex items-center justify-between mb-8">
        <Link href="/" className="p-2 -ml-2 text-gray-400 hover:text-gray-600 transition">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="text-sm font-semibold text-gray-500">
          🔤 English Spelling • {currentIndex + 1} / {words.length}
        </div>
        <div className="w-6" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center">


        {/* Big Audio Replay Button */}
        <button
          onClick={() => speakWord(currentWord.content)}
          className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 hover:bg-indigo-200 transition shadow-xs active:scale-95"
          title="点击重新播放发音"
        >
          <Volume2 className="w-10 h-10" />
        </button>

        {/* Input Form & Feedback */}
        <div className="w-full max-w-md space-y-6">
          {status !== "breakdown" ? (
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type the spelling here..."
                  disabled={status === "correct"}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  className="w-full px-5 py-4 text-center text-2xl font-bold tracking-wider border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-indigo-500 bg-white shadow-2xs font-sans disabled:bg-emerald-50 disabled:border-emerald-300 disabled:text-emerald-900"
                />
              </div>

              {feedbackMsg && (
                <div
                  className={`p-3 rounded-xl text-center text-sm font-bold animate-in fade-in duration-150 ${
                    status === "correct"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      : "bg-amber-100 text-amber-900 border border-amber-200"
                  }`}
                >
                  {feedbackMsg}
                </div>
              )}

              {status === "idle" && (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-2xl shadow-xs hover:bg-indigo-700 transition disabled:opacity-50 min-h-[50px]"
                >
                  提交答案 (Check)
                </button>
              )}

              {status === "retry" && (
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2 min-h-[48px]"
                  >
                    <RotateCcw className="w-4 h-4" />
                    再试一次 (Retry)
                  </button>
                </div>
              )}

              {status === "correct" && (
                <button
                  type="button"
                  onClick={handleNextWord}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-2xl shadow-xs transition flex items-center justify-center gap-2 min-h-[50px]"
                >
                  答对了！下一个词 (Next)
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}
            </form>
          ) : (
            <div>
              {loadingScaffolding ? (
                <div className="p-8 text-center text-gray-500 font-medium animate-pulse">
                  🧩 正在准备音节拆解与规律辅助...
                </div>
              ) : (
                <SyllableBreakdown
                  wordContent={currentWord.content}
                  userAttempt={userInput}
                  syllableData={syllableData}
                  onDismiss={handleNextWord}
                />
              )}
            </div>
          )}
        </div>
      </main>
      <audio ref={audioRef} preload="auto" className="hidden" />
    </div>
  );
}
