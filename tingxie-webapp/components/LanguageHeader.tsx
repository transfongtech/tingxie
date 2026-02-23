"use client";

import { Language } from "@/lib/language";
import { setLanguage } from "@/app/actions/language";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

interface LanguageHeaderProps {
    currentLang: Language;
}

export function LanguageHeader({ currentLang }: LanguageHeaderProps) {
    const router = useRouter();

    const handleToggle = async (lang: Language) => {
        if (lang === currentLang) return;
        await setLanguage(lang);
        router.refresh();
    };

    return (
        <div className="flex items-center gap-1 bg-white/80 backdrop-blur-sm p-1 rounded-full border border-slate-200 shadow-sm">
            <div className="pl-2 pr-1 text-slate-400">
                <Languages className="w-4 h-4" />
            </div>
            <button
                onClick={() => handleToggle("zh")}
                className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold transition-all",
                    currentLang === "zh"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "text-slate-500 hover:bg-slate-100"
                )}
            >
                华文听写
            </button>
            <button
                onClick={() => handleToggle("en")}
                className={cn(
                    "px-3 py-1 rounded-full text-sm font-bold transition-all",
                    currentLang === "en"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                        : "text-slate-500 hover:bg-slate-100"
                )}
            >
                English Spelling
            </button>
        </div>
    );
}
