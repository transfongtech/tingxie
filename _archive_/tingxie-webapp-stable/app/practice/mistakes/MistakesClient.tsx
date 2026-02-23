"use client";

import { PracticeSession } from "@/components/PracticeSession";
import { useState } from "react";
import { Sparkles, Play, Pause, Loader2 } from "lucide-react";

interface Word {
    id: number;
    content: string;
    pinyin?: string | null;
}

interface PageProps {
    words: Word[];
    language?: string;
}

// Client wrapper for the session & story mode
export default function MistakesClient({ words, language = "zh" }: PageProps) {
    const [story, setStory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    const generateStory = async () => {
        setIsLoading(true);
        try {
            // Filter out long sentences, keep only words
            const vocab = words.filter(w => w.content.length <= 8).map(w => w.content);
            // Limit to random 10 if too many
            const selected = vocab.sort(() => 0.5 - Math.random()).slice(0, 10);

            if (selected.length === 0) {
                alert("No suitable words found for a story (need simple words, not long sentences).");
                setIsLoading(false);
                return;
            }

            const res = await fetch("/api/story/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ words: selected }),
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
            alert("Failed to generate story: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleAudio = () => {
        if (!story) return;

        if (isPlaying && audio) {
            audio.pause();
            setIsPlaying(false);
        } else {
            // Clean pinyin for TTS: Remove (pinyin) parts to read smoothly
            const cleanText = story.replace(/\([a-zA-Z\s\u0300-\u036f]+\)/g, "");

            // Use same robust logic as PracticeSession
            const newAudio = new Audio(`/api/tts?text=${encodeURIComponent(cleanText)}&lang=${language}`);
            // Force src reload if needed, but remove timestamp for caching

            newAudio.onended = () => setIsPlaying(false);
            newAudio.onerror = (e) => {
                console.error("Story Audio Failed:", e);
                alert("Audio failed to play. Please try again.");
                setIsPlaying(false);
            };

            newAudio.play().catch(e => {
                if (e.name === 'AbortError') return;
                console.error("Story Play Error:", e);
                alert("Audio play error: " + e.message);
                setIsPlaying(false);
            });

            setAudio(newAudio);
            setIsPlaying(true);
        }
    };

    return (
        <div className="relative">
            {/* Story Modal / Overlay */}
            {story && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl relative">
                        <button
                            onClick={() => {
                                if (audio) {
                                    audio.pause();
                                    setAudio(null);
                                }
                                setIsPlaying(false);
                                setStory(null);
                            }}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
                        >
                            Close
                        </button>

                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
                            <Sparkles className="w-6 h-6" />
                            Creative Story
                        </h2>

                        <div className="prose prose-lg text-slate-700 leading-relaxed whitespace-pre-wrap mb-6 font-medium">
                            {story}
                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={toggleAudio}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                {isPlaying ? "Pause" : "Read Aloud"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Action Button for Story */}
            {!story && words.length > 0 && (
                <button
                    onClick={generateStory}
                    disabled={isLoading}
                    className="fixed bottom-6 right-6 z-40 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-full font-bold shadow-lg shadow-violet-200 hover:scale-105 transition-all flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    Yarn a Story
                </button>
            )}

            <PracticeSession weekNumber={0} words={words} language={language} />
        </div>
    );
}
