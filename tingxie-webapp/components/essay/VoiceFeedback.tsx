"use client";

import { useState, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";

export function VoiceFeedback({ text }: { text: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleSpeak = async () => {
    // 正在播放 → 停止
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // 开始加载并播放
    setIsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "en" }),
      });

      if (!res.ok) {
        throw new Error("TTS request failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      // 创建或复用 audio 元素
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.src = url;
      audioRef.current.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };
      audioRef.current.onerror = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Voice feedback error:", err);
      // Fallback: 使用浏览器 speechSynthesis
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 0.9;
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        setIsPlaying(true);
        window.speechSynthesis.speak(utterance);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={toggleSpeak}
      disabled={isLoading}
      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
        isLoading
          ? "bg-gray-400 text-white cursor-wait"
          : isPlaying
          ? "bg-amber-600 hover:bg-amber-700 text-white animate-pulse"
          : "bg-violet-600 hover:bg-violet-700 text-white"
      }`}
    >
      {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      <span>
        {isLoading
          ? "Generating voice..."
          : isPlaying
          ? "Stop Feedback"
          : "Listen to Teacher's Feedback 🔊"}
      </span>
    </button>
  );
}
