"use client";

import { Annotation } from "@/lib/essay-types";

interface AnnotatedTextProps {
  originalText: string;
  annotations: Annotation[];
  activeAnnotation: Annotation | null;
  onAnnotationSelect: (annotation: Annotation | null) => void;
  dimUnmatched?: boolean;
}

interface TextSegment {
  text: string;
  annotation?: Annotation;
}

export function AnnotatedText({
  originalText,
  annotations,
  activeAnnotation,
  onAnnotationSelect,
  dimUnmatched = false,
}: AnnotatedTextProps) {
  // 1. 根据 annotations 索引切割文本
  const sortedAnnotations = [...annotations]
    .filter((a) => a.startIndex >= 0 && a.endIndex <= originalText.length)
    .sort((a, b) => a.startIndex - b.startIndex);

  const rawSegments: TextSegment[] = [];
  let currentIndex = 0;

  for (const ann of sortedAnnotations) {
    if (ann.startIndex > currentIndex) {
      rawSegments.push({
        text: originalText.substring(currentIndex, ann.startIndex),
      });
    }

    if (ann.endIndex > ann.startIndex) {
      rawSegments.push({
        text: originalText.substring(ann.startIndex, ann.endIndex),
        annotation: ann,
      });
      currentIndex = ann.endIndex;
    }
  }

  if (currentIndex < originalText.length) {
    rawSegments.push({ text: originalText.substring(currentIndex) });
  }

  // 2. 按换行符 \n 将 rawSegments 划分为不同段落 (Paragraphs)
  const paragraphs: TextSegment[][] = [[]];

  for (const seg of rawSegments) {
    if (!seg.text.includes("\n")) {
      paragraphs[paragraphs.length - 1].push(seg);
    } else {
      const parts = seg.text.split("\n");
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length > 0) {
          paragraphs[paragraphs.length - 1].push({
            text: parts[i],
            annotation: seg.annotation,
          });
        }
        if (i < parts.length - 1) {
          // 遇到换行，新建一段
          paragraphs.push([]);
        }
      }
    }
  }

  const getTypeStyle = (type: Annotation["type"]) => {
    switch (type) {
      case "spelling":
        return "bg-rose-50 text-rose-950 border-b-2 border-rose-300 hover:bg-rose-100";
      case "grammar":
        return "bg-amber-100 text-amber-900 border-b-2 border-amber-500 hover:bg-amber-200";
      case "structure":
        return "bg-blue-100 text-blue-900 border-b-2 border-blue-500 hover:bg-blue-200";
      case "vocabulary":
        return "bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 hover:bg-emerald-200";
      default:
        return "bg-gray-100 text-gray-900 border-b-2 border-gray-400";
    }
  };

  return (
    <div className="space-y-4 print:space-y-3 font-sans text-lg md:text-xl leading-[2.2] tracking-wide text-gray-900">
      {paragraphs.map((pSegments, pIdx) => {
        // 如果此段为空段落（连续 Enter 换行），渲染为空行段落
        if (pSegments.length === 0 || (pSegments.length === 1 && !pSegments[0].text.trim())) {
          return <div key={pIdx} className="h-4" />;
        }

        return (
          <p key={pIdx} className="mb-4 print:mb-3 text-justify indent-8 sm:indent-10">
            {pSegments.map((seg, sIdx) => {
              if (!seg.annotation) {
                return (
                  <span
                    key={sIdx}
                    className={dimUnmatched ? "text-gray-400/80 transition-colors" : ""}
                  >
                    {seg.text}
                  </span>
                );
              }

              const isSelected = activeAnnotation === seg.annotation;

              return (
                <span
                  key={sIdx}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`${seg.annotation.type} note: ${seg.text}`}
                  onClick={() => onAnnotationSelect(isSelected ? null : seg.annotation!)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onAnnotationSelect(isSelected ? null : seg.annotation!);
                    }
                  }}
                  className={`cursor-pointer px-1 py-0.5 rounded transition-all duration-150 relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 ${getTypeStyle(
                    seg.annotation.type
                  )} ${isSelected ? "ring-2 ring-violet-600 font-medium" : ""}`}
                  title="Click to view teacher's notes"
                >
                  {seg.text}
                </span>
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
