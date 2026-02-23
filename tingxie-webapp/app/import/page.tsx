"use client";

import { saveWords } from "@/app/actions/import";
import { useState } from "react";
import { ArrowLeft, Save, Upload } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function ImportPage() {
    const [status, setStatus] = useState<{ success?: boolean; message?: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsSubmitting(true);
        setStatus(null);

        const result = await saveWords(formData);

        setStatus(result);
        setIsSubmitting(false);

        if (result.success) {
            // Optional: clear form or redirect
        }
    }

    return (
        <main className="max-w-3xl mx-auto p-4 md:p-8 space-y-8">
            <header className="flex items-center gap-4">
                <Link
                    href="/"
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                >
                    <ArrowLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Import Words</h1>
                    <p className="text-slate-500">Bulk add spelling lists for a specific week</p>
                </div>
            </header>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <form action={handleSubmit} className="space-y-6">

                    <div>
                        <label htmlFor="week" className="block text-sm font-medium text-slate-700 mb-2">
                            Week Number
                        </label>
                        <input
                            type="number"
                            name="week"
                            id="week"
                            min="1"
                            max="52"
                            required
                            className="w-full md:w-32 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="1"
                        />
                    </div>

                    <div>
                        <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-2">
                            Words List
                        </label>
                        <div className="relative">
                            <textarea
                                name="content"
                                id="content"
                                rows={10}
                                required
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800"
                                placeholder="Paste words here...&#10;Example:&#10;苹果, 香蕉&#10;Orange&#10;Pear"
                            ></textarea>
                            <div className="absolute top-3 right-3 text-xs text-slate-400 pointer-events-none">
                                Supports commas & newlines
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className={cn(
                            "p-4 rounded-lg flex items-center gap-2 text-sm font-medium",
                            status.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}>
                            {status.success ? <Save className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            {status.message}
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center gap-2"
                        >
                            {isSubmitting ? "Saving..." : "Save Words"}
                            {!isSubmitting && <Save className="w-5 h-5" />}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
