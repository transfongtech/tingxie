"use client";

import { useState, useRef } from "react";
import { Volume2, VolumeX, Sparkles, Printer, Award } from "lucide-react";
import { EssayReviewResult } from "@/lib/essay-types";

interface PolishedViewProps {
  polishedText: string;
  promptTitle: string;
  scores?: EssayReviewResult["scores"];
}

export function PolishedView({ polishedText, promptTitle, scores }: PolishedViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // 计算 Polished Version 的目标得分
  const originalTotal = scores ? scores.content + scores.language : 0;
  const polishedContent = scores?.polishedScores?.content ?? (scores ? Math.min(18, scores.content + (scores.content < 15 ? 2 : 0)) : 18);
  const polishedLanguage = scores?.polishedScores?.language ?? 17; // 纠错润色后达到 L1/L2 顶峰
  const polishedTotal = polishedContent + polishedLanguage;
  const scoreImprovement = scores ? Math.max(0, polishedTotal - originalTotal) : 0;

  const handleReadAloud = () => {
    if (!window.speechSynthesis) {
      alert("Browser does not support Speech Synthesis");
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(polishedText);
    utterance.lang = "en-US";
    utterance.rate = 0.9;

    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const paragraphs = polishedText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Polished Composition — ${promptTitle}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 2.5cm 2cm; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; font-size: 13pt; line-height: 2.0; color: #2d2d2d; }
    .header { text-align: center; margin-bottom: 28pt; padding-bottom: 16pt; border-bottom: 2px solid #e8e0d4; }
    .header h1 { font-size: 18pt; font-weight: 600; color: #2d2d2d; margin-bottom: 6pt; }
    .header .subtitle { font-size: 10pt; color: #888; font-style: italic; }
    .score-badge { display: inline-block; margin-top: 8pt; padding: 4pt 12pt; background: #f5f3ff; color: #5b21b6; border-radius: 20pt; font-size: 11pt; font-weight: bold; }
    .essay p { text-indent: 2em; margin-bottom: 12pt; }
    .tip { margin-top: 40pt; padding: 16pt 20pt; background: #faf8f4; border: 1px solid #e8e0d4; border-radius: 8pt; font-size: 10pt; color: #666; line-height: 1.8; }
    .tip strong { color: #5b21b6; }
    .footer { margin-top: 36pt; text-align: center; font-size: 9pt; color: #aaa; font-style: italic; }
    @media print { .tip { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>📝 ${promptTitle}</h1>
    <div class="subtitle">Polished & Cleaned Version (Preserving George's Storyline)</div>
    ${scores ? `<div class="score-badge">Target Score: ${polishedTotal} / 36 (Content: ${polishedContent}/18, Language: ${polishedLanguage}/18)</div>` : ''}
  </div>
  <div class="essay">${paragraphs}</div>
  <div class="tip">
    <strong>📖 Learning Tip:</strong> Read this polished version carefully. Pay attention to how sentence structure, grammar, and vocabulary were improved while keeping the original story intact. Then try writing your composition again in your own words!
  </div>
  <div class="footer">Tingxie Practice — Composition Module</div>
</body>
</html>`);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
    }, 500);
  };

  return (
    <div className="space-y-4">
      <iframe ref={iframeRef} className="hidden" title="print-frame" aria-hidden="true" />

      {/* Polished Score Banner */}
      {scores && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-xs">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">Polished Version Target Score</h4>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-gray-900 px-2 py-0.5 rounded-full">
                  Cleaned & Improved
                </span>
              </div>
              <p className="text-xs text-violet-200 mt-0.5">
                Fixed grammar/spelling & upgraded phrasing while preserving George&apos;s original plot
              </p>
            </div>
          </div>

          <div className="text-right flex-shrink-0 pl-3">
            <div className="text-2xl font-extrabold text-amber-300">
              {polishedTotal} <span className="text-xs font-normal text-white/80">/ 36</span>
            </div>
            <div className="text-[11px] font-medium text-violet-200 mt-0.5">
              Content {polishedContent}/18 • Language {polishedLanguage}/18
            </div>
            {scoreImprovement > 0 && (
              <span className="inline-block mt-1 text-[10px] font-bold bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                +{scoreImprovement} pts vs original ({originalTotal}/36)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Header toolbar */}
      <div className="flex items-center justify-between bg-white px-5 py-3 rounded-2xl border border-amber-100/80 shadow-xs text-xs font-medium">
        <div className="flex items-center gap-2 text-violet-700">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span>Cleaned & Polished Version</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          <button
            onClick={handleReadAloud}
            className={`px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 text-white ${
              isPlaying ? "bg-amber-600 hover:bg-amber-700 animate-pulse" : "bg-violet-600 hover:bg-violet-700"
            }`}
          >
            {isPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Stop" : "Read Aloud 🔊"}</span>
          </button>
        </div>
      </div>

      {/* Polished Composition Display — copy/select disabled */}
      <div
        className="bg-[#FEFCF8] rounded-3xl p-6 md:p-8 border border-amber-100/90 shadow-xs text-lg md:text-xl leading-[2.2] font-sans tracking-wide space-y-5 select-none"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      >
        {polishedText
          .split(/\n+/)
          .map((p) => p.trim())
          .filter(Boolean)
          .map((para, idx) => (
            <p key={idx} className="mb-5 text-gray-800 leading-[2.2] text-justify indent-8 sm:indent-10 font-sans">
              {para}
            </p>
          ))}
      </div>
    </div>
  );
}
