"use client";

import { PenTool } from "lucide-react";
import { setHandwritingMode } from "@/app/actions/handwriting";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface HandwritingToggleProps {
    enabled: boolean;
}

export function HandwritingToggle({ enabled }: HandwritingToggleProps) {
    const router = useRouter();

    const handleToggle = async () => {
        await setHandwritingMode(!enabled);
        router.refresh(); // Refresh to propagate state to Server Components (like WeeklyPractice links)
    };

    return (
        <button
            onClick={handleToggle}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border",
                enabled
                    ? "bg-amber-100 text-amber-800 border-amber-200 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
        >
            <PenTool className="w-4 h-4" />
            <span>{enabled ? "Handwriting On" : "Handwriting Off"}</span>
            {enabled && <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>}
        </button>
    );
}
