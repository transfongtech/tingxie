"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, loadDraft, deleteDraft, submitEssay } from "@/app/actions/essay";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import { ReviewStatus } from "./ReviewStatus";
import { requestPersistedEssayReview } from "./review-request-client";

interface CompositionEditorProps {
  promptId: number;
  promptTitle: string;
  lastSubmittedAt?: string | null;
  onRegisterInsertHandler?: (handler: (phrase: string) => void) => void;
}

export function CompositionEditor({
  promptId,
  lastSubmittedAt,
  onRegisterInsertHandler,
}: CompositionEditorProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  
  // Draft Recovery State
  const [recoveredDraft, setRecoveredDraft] = useState<{ text: string; wordCount: number; updatedAt: Date } | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedSubmissionId, setSubmittedSubmissionId] = useState<number | null>(null);
  const submissionRunningRef = useRef(false);

  // Flow Mode State
  const [flowMode, setFlowMode] = useState(false);
  const [flowTimer, setFlowTimer] = useState<number | null>(null);
  const [showFlowModal, setShowFlowModal] = useState(false);
  const flowTimerRef = useRef<NodeJS.Timeout | null>(null);

  const localKey = `essay_draft_${promptId}`;
  const localSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const serverSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const startFlowMode = (timerMinutes: number | null) => {
    setFlowMode(true);
    setShowFlowModal(false);
    if (timerMinutes) {
      const totalSecs = timerMinutes * 60;
      setFlowTimer(totalSecs);
      if (flowTimerRef.current) clearInterval(flowTimerRef.current);
      flowTimerRef.current = setInterval(() => {
        setFlowTimer((prev) => {
          if (prev === null || prev <= 1) {
            if (flowTimerRef.current) clearInterval(flowTimerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFlowTimer(null);
    }
  };

  const exitFlowMode = () => {
    setFlowMode(false);
    if (flowTimerRef.current) clearInterval(flowTimerRef.current);
    setFlowTimer(null);
  };

  useEffect(() => {
    if (flowTimer === 0 && flowMode) {
      exitFlowMode();
    }
  }, [flowTimer, flowMode]);



  // 1. 页面加载时：检测草稿恢复
  useEffect(() => {
    async function checkDrafts() {
      let draftText = "";
      let draftTime: Date | null = null;
      let draftWords = 0;

      const lastSubmitTime = lastSubmittedAt ? new Date(lastSubmittedAt) : null;

      // 检查 localStorage
      try {
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const parsed = JSON.parse(localData);
          if (parsed.text && parsed.text.trim()) {
            const lTime = new Date(parsed.timestamp || Date.now());
            // 如果本地草稿生成在提交时间之前或差不多同一时间（允许 5 秒容差），则是已提交的老草稿，清理它
            if (lastSubmitTime && lTime.getTime() <= lastSubmitTime.getTime() + 5000) {
              localStorage.removeItem(localKey);
            } else {
              draftText = parsed.text;
              draftTime = lTime;
              draftWords = parsed.wordCount || 0;
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse local draft", e);
      }

      // 检查服务端备份
      try {
        const serverRes = await loadDraft(promptId);
        if (serverRes.success && serverRes.data) {
          const sDate = new Date(serverRes.data.updatedAt);
          // 如果服务端草稿修改时间早于或等于上一次提交时间（允许 5 秒容差），说明也是已提交的老草稿，擦除它
          if (lastSubmitTime && sDate.getTime() <= lastSubmitTime.getTime() + 5000) {
            deleteDraft(promptId);
          } else if (!draftTime || sDate > draftTime) {
            draftText = serverRes.data.text;
            draftTime = sDate;
            draftWords = serverRes.data.wordCount;
          }
        }
      } catch (e) {
        console.warn("Failed to load server draft", e);
      }

      if (draftText && draftText.trim().length > 0) {
        setRecoveredDraft({
          text: draftText,
          wordCount: draftWords,
          updatedAt: draftTime || new Date(),
        });
        setShowRecoveryModal(true);
      }
    }

    checkDrafts();
  }, [promptId, localKey, lastSubmittedAt]);

  // 2. 双层防抖自动保存
  const triggerAutoSave = useCallback((newText: string) => {
    setSaveStatus("saving");

    // Layer 1: localStorage (2秒防抖)
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    localSaveTimerRef.current = setTimeout(() => {
      try {
        const payload = {
          text: newText,
          wordCount: newText.trim().split(/\s+/).filter(Boolean).length,
          timestamp: Date.now(),
        };
        localStorage.setItem(localKey, JSON.stringify(payload));
        setSaveStatus("saved");
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (e) {
        console.error("Local draft save error", e);
      }
    }, 2000);

    // Layer 2: Server Action (30秒防抖)
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);
    serverSaveTimerRef.current = setTimeout(async () => {
      await saveDraft(promptId, newText);
    }, 30000);
  }, [promptId, localKey]);

  const insertPhraseAtCursor = useCallback(
    (phrase: string) => {
      if (!textareaRef.current) {
        const newText = text ? `${text} ${phrase}` : phrase;
        setText(newText);
        triggerAutoSave(newText);
        return;
      }

      const start = textareaRef.current.selectionStart || text.length;
      const end = textareaRef.current.selectionEnd || text.length;

      const prefixSpace = start > 0 && text[start - 1] !== " " ? " " : "";
      const newText =
        text.substring(0, start) + prefixSpace + phrase + " " + text.substring(end);
      setText(newText);
      triggerAutoSave(newText);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const nextPos = start + prefixSpace.length + phrase.length + 1;
          textareaRef.current.setSelectionRange(nextPos, nextPos);
        }
      }, 50);
    },
    [text, triggerAutoSave]
  );

  useEffect(() => {
    if (onRegisterInsertHandler) {
      onRegisterInsertHandler(insertPhraseAtCursor);
    }
  }, [onRegisterInsertHandler, insertPhraseAtCursor]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setSaveStatus("unsaved");
    triggerAutoSave(val);
  };

  const insertNewParagraph = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const indent = text.length === 0 ? "    " : "\n    ";

    const newText = text.substring(0, start) + indent + text.substring(end);
    setText(newText);
    setSaveStatus("unsaved");
    triggerAutoSave(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + indent.length;
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const indent = "    "; // 4 个空格代表缩进

      const newText = text.substring(0, start) + indent + text.substring(end);
      setText(newText);
      setSaveStatus("unsaved");
      triggerAutoSave(newText);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + indent.length;
        }
      }, 0);
    } else if (e.key === "Enter" && !e.shiftKey) {
      // 敲 Enter 回车提行：自动换行并留出段落首行缩进 (4个空格)
      e.preventDefault();
      insertNewParagraph();
    }
  };

  // 3. 页面离开警告 (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (text.trim().length > 10 && saveStatus !== "saved") {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [text, saveStatus]);

  // 恢复草稿动作
  const applyRecoveredDraft = () => {
    if (recoveredDraft) {
      setText(recoveredDraft.text);
      setSaveStatus("saved");
    }
    setShowRecoveryModal(false);
  };

  const discardRecoveredDraft = () => {
    localStorage.removeItem(localKey);
    deleteDraft(promptId);
    setShowRecoveryModal(false);
  };

  // 4. 提交作文动作
  const handleSubmit = async () => {
    if (submissionRunningRef.current || submittedSubmissionId !== null) return;
    if (wordCount < 50) {
      setErrorMsg("Please write at least 50 words before submitting.");
      return;
    }

    if (!confirm("Are you sure you want to submit your composition? AI teacher will review it right away!")) {
      return;
    }

    // 取消尚未执行的防抖定时器
    if (localSaveTimerRef.current) clearTimeout(localSaveTimerRef.current);
    if (serverSaveTimerRef.current) clearTimeout(serverSaveTimerRef.current);

    setIsSubmitting(true);
    submissionRunningRef.current = true;
    setErrorMsg(null);

    try {
      // 执行提交
      const res = await submitEssay(promptId, text);
      if (!res.success || !res.data) {
        throw new Error(res.error || "Failed to submit composition");
      }

      const submissionId = res.data.submissionId;
      setSubmittedSubmissionId(submissionId);

      // 清除本地与服务端草稿
      localStorage.removeItem(localKey);
      await deleteDraft(promptId);

      await requestPersistedEssayReview(submissionId);

      router.push(`/essay/submission/${submissionId}`);
      router.refresh();
    } catch (err: unknown) {
      console.error("Submit composition error:", err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Something went wrong during submission. Please try again.",
      );
      setIsSubmitting(false);
    } finally {
      submissionRunningRef.current = false;
    }
  };

  // 进度条样式计算
  const getProgressColor = () => {
    if (wordCount < 50) return "bg-gray-400";
    if (wordCount < 150) return "bg-amber-500";
    if (wordCount < 300) return "bg-emerald-500";
    return "bg-indigo-600";
  };

  const targetPercentage = Math.min(100, Math.round((wordCount / 150) * 100));

  return (
    <div className="flex flex-col h-full space-y-4 relative justify-between">
      {/* Draft Recovery Modal */}
      {showRecoveryModal && recoveredDraft && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-5 border border-amber-100">
            <div className="flex items-center gap-3 text-violet-600">
              <div className="p-3 bg-violet-50 rounded-2xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">Welcome Back, George!</h3>
                <p className="text-xs text-gray-500">
                  Saved on {new Date(recoveredDraft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed">
              We found your unfinished composition draft (<strong>{recoveredDraft.wordCount} words</strong>). Would you like to continue where you left off?
            </p>

            <div className="p-3 bg-slate-50 rounded-xl text-xs text-gray-500 italic line-clamp-3 font-sans">
              &ldquo;{recoveredDraft.text.substring(0, 150)}...&rdquo;
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={discardRecoveredDraft}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Start New
              </button>
              <button
                onClick={applyRecoveredDraft}
                className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 shadow-sm transition-colors"
              >
                Continue Writing ✍️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flow Mode Timer Selection Modal */}
      {showFlowModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-amber-100 space-y-5 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Enter Flow Mode</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Write freely without distractions! Set an optional timer to keep your pace.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => startFlowMode(15)}
                className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-200"
              >
                ⏱ 15 min
              </button>
              <button
                onClick={() => startFlowMode(20)}
                className="py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition border border-indigo-200"
              >
                ⏱ 20 min
              </button>
              <button
                onClick={() => startFlowMode(null)}
                className="py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl text-xs transition border border-gray-200"
              >
                No timer
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowFlowModal(false)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-gray-600 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flow Mode Banner (when Flow Mode is active) */}
      {flowMode && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs md:text-sm text-indigo-950 font-medium leading-relaxed">
              <p className="font-bold text-indigo-900 mb-0.5">✍️ Just write! Don&apos;t worry about spelling.</p>
              <p className="text-indigo-800/80">
                Use <code className="bg-white/80 border border-indigo-200 px-1.5 py-0.5 rounded text-indigo-950 font-mono font-bold text-xs">___</code> or first letters for tricky words. You can fix everything later!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {flowTimer !== null && (
              <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-mono font-bold shadow-2xs">
                ⏱ {Math.floor(flowTimer / 60).toString().padStart(2, "0")}:
                {(flowTimer % 60).toString().padStart(2, "0")} remaining
              </span>
            )}
            <button
              onClick={exitFlowMode}
              className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shadow-2xs"
            >
              Exit ✕
            </button>
          </div>
        </div>
      )}

      {/* Editor Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-amber-100/80 shadow-xs text-xs font-medium">
        <div className="flex items-center gap-2 text-gray-500">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-amber-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving draft...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {lastSavedTime ? `Draft saved (${lastSavedTime})` : "Auto-save active"}
            </span>
          )}
        </div>

        {/* Word Progress Indicator (Hidden in Flow Mode) */}
        {!flowMode ? (
          <div className="flex items-center gap-3">
            <button
              onClick={insertNewParagraph}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Start a new paragraph with indent (Press Enter)"
            >
              <span>↵ New Paragraph (段落首行留空)</span>
            </button>

            <button
              onClick={() => setShowFlowModal(true)}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 text-indigo-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
              title="Enter Flow Mode (distraction-free writing)"
            >
              <Sparkles className="w-3.5 h-3.5" /> ✍️ Flow Mode
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Target: 150+ words</span>
              <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${targetPercentage}%` }}
                />
              </div>
            </div>
            <span className="font-bold text-gray-900 text-sm">{wordCount} words</span>
          </div>
        ) : (
          <span className="text-indigo-600 font-bold text-xs flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Flow Mode Active
          </span>
        )}
      </div>

      {errorMsg && submittedSubmissionId === null && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {submittedSubmissionId !== null && errorMsg && (
        <ReviewStatus
          submissionId={submittedSubmissionId}
          status="review_failed"
          initialError={errorMsg}
          onSuccess={() => {
            router.push(`/essay/submission/${submittedSubmissionId}`);
            router.refresh();
          }}
        />
      )}

      {/* Paper-like Immersive Textarea (Flex fill height) */}
      <div className="flex-1 flex flex-col relative rounded-3xl overflow-hidden shadow-xs border border-amber-100/90 bg-[#FEFCF8] min-h-0">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="sentences"
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          placeholder="Start writing your composition here... (Press Enter for a new indented paragraph)"
          className="w-full flex-1 p-5 md:p-6 text-lg md:text-xl leading-[32px] bg-transparent focus:outline-none caret-violet-600 resize-none font-sans tracking-wide placeholder:text-gray-300 placeholder:italic min-h-0 h-full overflow-y-auto"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #f0ebe3 31px, #f0ebe3 32px)',
            backgroundSize: '100% 32px',
            paddingTop: '8px',
          }}
        />
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-400">
          {!flowMode && (wordCount < 50 ? `Write ${50 - wordCount} more words to submit` : "Ready to submit!")}
        </span>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || wordCount < 50 || submittedSubmissionId !== null}
          className="px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-bold text-base hover:from-violet-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 min-h-[48px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Reviewing composition... ✨
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" /> Submit for AI Review ✍️
            </>
          )}
        </button>
      </div>
    </div>
  );
}
