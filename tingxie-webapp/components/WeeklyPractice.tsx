"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, CheckCircle, ChevronRight, Play, Star, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface WeekData {
    id: number;
    number: number;
    title: string;
    wordCount: number;
    completed: number;
    isActive: boolean;
    language: string;
}

interface WeeklyPracticeProps {
    weeks: WeekData[];
    handwritingMode?: boolean;
}

export function WeeklyPractice({ weeks, handwritingMode = false }: WeeklyPracticeProps) {
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

    // Filter weeks by language is now handled by parent/server side.
    const displayedWeeks = weeks;

    if (weeks.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No content found</h3>
                <p className="text-slate-500 mt-1 mb-4">Try switching language or add new words.</p>
                <Link href="/import">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm inline-flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                        <Plus className="w-4 h-4" />
                        Add Words
                    </button>
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        Weekly Practice
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Focus on this week's spelling list
                    </p>
                </div>

                {/* Local Language Toggle Removed - Controlled Globally */}
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedWeeks.map((week) => (
                    <motion.div
                        key={week.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedWeek(week.id)}
                        className={cn(
                            "cursor-pointer p-4 rounded-xl border transition-all relative overflow-hidden group",
                            week.isActive
                                ? "border-indigo-200 bg-indigo-50/50"
                                : "border-slate-100 hover:border-indigo-100 hover:shadow-md"
                        )}
                    >
                        {week.isActive && (
                            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-bl-lg font-bold">
                                CURRENT
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-3">
                            <div className="bg-indigo-100 text-indigo-700 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
                                {week.number}
                            </div>
                            {week.completed > 0 && (
                                <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    {Math.round((week.completed / week.wordCount) * 100)}%
                                </div>
                            )}
                        </div>

                        <h3 className="font-semibold text-slate-900 mb-1">{week.title}</h3>
                        <p className="text-xs text-slate-500 mb-4">{week.wordCount} words</p>

                        <Link href={`/practice/${week.id}${handwritingMode ? '?mode=handwriting' : ''}`} className="block">
                            <button className="w-full py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-colors flex items-center justify-center gap-2">
                                <Play className="w-3 h-3" />
                                Start Practice
                            </button>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
