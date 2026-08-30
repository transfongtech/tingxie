"use client";

import { useState } from "react";
import { ZoomIn, ZoomOut, Image as ImageIcon } from "lucide-react";

interface PromptImage {
  id: number;
  imagePath: string;
  sortOrder: number;
}

export function PromptViewer({
  title,
  description,
  images,
}: {
  title: string;
  description: string | null;
  images: PromptImage[];
}) {
  const [selectedImg, setSelectedImg] = useState<string | null>(
    images.length > 0 ? images[0].imagePath : null
  );
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="bg-white rounded-3xl p-6 border border-amber-100/80 shadow-xs space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="text-gray-500 text-xs mt-1 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {images.length > 0 ? (
        <div className="space-y-3">
          {/* Main Selected Image */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-gray-100 aspect-4/3 max-h-[360px] flex items-center justify-center group">
            {selectedImg && (
              <img
                src={selectedImg}
                alt={title}
                className={`w-full h-full object-contain transition-transform duration-300 ${
                  isZoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in"
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            )}

            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-xs transition-colors"
              title={isZoomed ? "Zoom Out" : "Zoom In"}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>
          </div>

          {/* Thumbnails list if multiple */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => {
                    setSelectedImg(img.imagePath);
                    setIsZoomed(false);
                  }}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImg === img.imagePath
                      ? "border-violet-600 ring-2 ring-violet-500/20"
                      : "border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img.imagePath} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-slate-50 rounded-2xl text-center text-gray-400 space-y-2">
          <ImageIcon className="w-8 h-8 mx-auto stroke-1 text-gray-300" />
          <p className="text-xs">This topic has no picture prompt.</p>
        </div>
      )}
    </div>
  );
}
