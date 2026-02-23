"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Eye, Check, X, ArrowRight, RotateCcw, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { logReview } from "@/app/actions/review";
import { cn } from "@/lib/utils";
import { HandwritingCanvas, HandwritingCanvasRef } from "./HandwritingCanvas";
import { createPortal } from "react-dom";
import { compareHandwriting } from "@/lib/handwriting";


interface Word {
    id: number;
    content: string;
    pinyin?: string | null;
}

interface PracticeSessionProps {
    weekNumber: number;
    words: Word[];
    language?: string; // "zh" or "en"
    handwritingMode?: boolean;
}

export function PracticeSession({ weekNumber, words: initialWords, language = "zh", handwritingMode = false }: PracticeSessionProps) {
    // Shuffle words on mount and keep them stable across server re-renders
    const [words] = useState(() => {
        const shuffled = [...initialWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const [results, setResults] = useState<{ correct: number; wrong: number }>({ correct: 0, wrong: 0 });

    const currentWord = words[currentIndex];

    // Check if we should enable handwriting for this specific word
    // zh: Skip if length > 6 chars
    // en: Skip if word count > 3 words
    const shouldUseHandwriting = handwritingMode && currentWord && (
        language === "zh"
            ? currentWord.content.length <= 6
            : currentWord.content.split(/\s+/).filter(w => w.length > 0).length <= 3
    );

    // Handwriting State
    const canvasRef = useRef<HandwritingCanvasRef>(null);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [recognizedText, setRecognizedText] = useState<string | null>(null);
    const [autoCheckResult, setAutoCheckResult] = useState<boolean | null>(null);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);

    const speakWord = (text: string) => {
        setAudioError(null);
        if (audioRef.current) {
            // Remove timestamp to allow browser caching - critical for tunnel/latency performance
            const newSrc = `/api/tts?text=${encodeURIComponent(text)}&lang=${language}`;

            // Check if we are playing the same file to avoid unnecessary reload
            // Note: .src property returns absolute URL, so simple comparison handles most changes
            if (!audioRef.current.src.endsWith(newSrc)) {
                audioRef.current.src = newSrc;
            }

            audioRef.current.play().catch(e => {
                // Ignore AbortError: caused by "interrupted by a new load request"
                if (e.name === 'AbortError' || e.message.includes('interrupted')) {
                    return;
                }
                console.error("Audio play failed", e);
                setAudioError(e.message);
            });
        }
    };

    // Auto-play when word changes
    useEffect(() => {
        if (currentWord && !isFinished) {
            // Slight delay to decouple from render cycle
            const t = setTimeout(() => speakWord(currentWord.content), 500);
            return () => clearTimeout(t);
        }
    }, [currentWord, isFinished]);

    const handleReveal = () => {
        setIsRevealed(true);
    };

    const handleCheckHandwriting = async () => {
        if (!canvasRef.current || canvasRef.current.isEmpty()) return;

        setIsRecognizing(true);
        try {
            const imageData = canvasRef.current.getImageData();
            if (!imageData) return;

            const response = await fetch("/api/handwriting-recognize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: imageData }),
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const recognized = data.text || "";
            setRecognizedText(recognized);

            // Auto-check if text was recognized
            if (recognized) {
                const isCorrect = compareHandwriting(recognized, currentWord.content);
                setAutoCheckResult(isCorrect);

                // No auto-progress, user must click next
            }

            setIsRevealed(true); // Show result UI
        } catch (error) {
            console.error("Recognition failed:", error);
            alert("Recognition failed. Please try again.");
        } finally {
            setIsRecognizing(false);
        }
    };


    const handleResult = async (correct: boolean) => {
        // Optimistic UI update
        setResults(prev => ({
            correct: prev.correct + (correct ? 1 : 0),
            wrong: prev.wrong + (correct ? 0 : 1),
        }));

        // Log to DB
        await logReview(currentWord.id, correct);

        // Move to next
        if (currentIndex < words.length - 1) {
            setIsRevealed(false);
            setRecognizedText(null);
            setAutoCheckResult(null);
            if (canvasRef.current) canvasRef.current.clear();
            setCurrentIndex(prev => prev + 1);
        } else {
            setIsFinished(true);
        }
    };

    if (words.length === 0) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-bold">No words found for this week.</h2>
                <Link href="/" className="text-indigo-600 underline mt-4 block">Go back</Link>
            </div>
        );
    }

    if (isFinished) {
        return (
            <div className="max-w-md mx-auto text-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100 mt-10">
                <h2 className="text-2xl font-bold text-slate-800 mb-4">Practice Complete!</h2>
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div className="text-sm font-medium text-slate-500 uppercase tracking-widest">
                        Week {weekNumber}
                    </div>
                    <div className="text-sm font-bold text-slate-400">
                        {currentIndex + 1} / {words.length}
                    </div>
                </div>
                <div className="flex justify-center gap-8 mb-8">
                    <div className="text-emerald-600">
                        <div className="text-4xl font-bold">{results.correct}</div>
                        <div className="text-sm font-medium">Correct</div>
                    </div>
                    <div className="text-rose-600">
                        <div className="text-4xl font-bold">{results.wrong}</div>
                        <div className="text-sm font-medium">Needs Practice</div>
                    </div>
                </div>
                <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto p-4 md:p-8 min-h-screen flex flex-col">
            <header className="flex items-center justify-between mb-8">
                <Link href="/" className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div className="text-sm font-medium text-slate-500">
                    Week {weekNumber} • {currentIndex + 1} / {words.length}
                </div>
                <div className="w-6" /> {/* Spacer */}
            </header>

            <main className="flex-1 flex flex-col items-center justify-center">

                {/* Audio Button */}
                <button
                    onClick={() => speakWord(currentWord.content)}
                    className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-8 hover:bg-indigo-100 hover:scale-105 transition-all shadow-sm"
                >
                    <Volume2 className="w-10 h-10" />
                </button>

                {/* Word Display (Hidden/Revealed) */}
                {/* Word Display (Hidden/Revealed) OR Handwriting Canvas */}
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mb-4">
                    <AnimatePresence mode="wait">
                        {!isRevealed ? (
                            shouldUseHandwriting ? (
                                <div className="w-full flex flex-col items-center gap-4">
                                    <HandwritingCanvas
                                        ref={canvasRef}
                                        width={800}
                                        height={400}
                                        className="w-full aspect-[2/1]"
                                    />
                                    {isRecognizing && (
                                        <div className="text-indigo-600 flex items-center gap-2 font-medium animate-pulse">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Recognizing...
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <motion.div
                                    key="hidden"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="text-slate-400 font-medium text-lg italic h-48 flex items-center justify-center"
                                >
                                    Listen and write it down...
                                </motion.div>
                            )
                        ) : (
                            <motion.div
                                key="revealed"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center w-full"
                            >
                                {shouldUseHandwriting && (
                                    <div className={cn(
                                        "mb-6 p-4 rounded-xl border-2 transition-all",
                                        autoCheckResult === true ? "bg-emerald-50 border-emerald-200" :
                                            autoCheckResult === false ? "bg-rose-50 border-rose-200" :
                                                "bg-slate-50 border-slate-100"
                                    )}>
                                        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                                            <span>You Wrote</span>
                                            {autoCheckResult !== null && (
                                                <span className={cn(
                                                    "flex items-center gap-1 font-bold",
                                                    autoCheckResult ? "text-emerald-600" : "text-rose-600"
                                                )}>
                                                    {autoCheckResult ? (
                                                        <><Check className="w-4 h-4" /> Correct!</>
                                                    ) : (
                                                        <><X className="w-4 h-4" /> Try Again</>
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-2xl font-bold text-slate-800">
                                            {recognizedText || "(No text detected)"}
                                        </div>
                                    </div>
                                )}

                                {currentWord.pinyin && language === "zh" && (
                                    <div className="text-xl md:text-2xl text-slate-400 font-medium mb-2 font-mono">
                                        {currentWord.pinyin}
                                    </div>
                                )}
                                <div className={cn(
                                    "text-slate-900",
                                    language === "zh" ? "font-kaiti font-normal" : "font-sans font-bold", // KaiTi looks bad with bold (fake bold)
                                    currentWord.content.length > 5 ? "text-3xl md:text-4xl" : "text-5xl md:text-6xl"
                                )}>
                                    {currentWord.content}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="w-full max-w-sm space-y-4">
                    {/* Native Audio Element for better compatibility */}
                    <audio ref={audioRef} className="hidden" />

                    {audioError && (
                        <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded-lg">
                            Audio Error: {audioError}
                        </div>
                    )}

                    {!isRevealed ? (
                        shouldUseHandwriting ? (
                            <button
                                onClick={handleCheckHandwriting}
                                disabled={isRecognizing}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRecognizing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Eye className="w-5 h-5" />}
                                Check Answer
                            </button>
                        ) : (
                            <button
                                onClick={handleReveal}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
                            >
                                <Eye className="w-5 h-5" />
                                Reveal Answer
                            </button>
                        )
                    ) : (
                        autoCheckResult === true ? (
                            <button
                                onClick={() => handleResult(true)}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-200"
                            >
                                <ArrowRight className="w-5 h-5" />
                                Next Word
                            </button>
                        ) : autoCheckResult === false ? (
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => {
                                        setRecognizedText(null);
                                        setAutoCheckResult(null);
                                        setIsRevealed(false); // Critical: switch back to canvas mode
                                        if (canvasRef.current) canvasRef.current.clear();
                                    }}
                                    className="w-full py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                    Try Again
                                </button>
                                <button
                                    onClick={() => handleResult(false)}
                                    className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-200"
                                >
                                    <ArrowRight className="w-5 h-5" />
                                    Next (Mark as Wrong)
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleResult(false)}
                                    className="py-4 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl font-bold text-lg hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-5 h-5" />
                                    Wrong
                                </button>
                                <button
                                    onClick={() => handleResult(true)}
                                    className="py-4 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-2xl font-bold text-lg hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Check className="w-5 h-5" />
                                    Correct
                                </button>
                            </div>
                        )
                    )}
                </div>
            </main>
        </div>
    );
}
