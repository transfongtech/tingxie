"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RotateCw, Check, X, Crop, Sun, Sparkles, Sliders } from "lucide-react";

interface ImageCropModalProps {
  imageSrc: string;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageSrc, onConfirm, onCancel }: ImageCropModalProps) {
  const [rotation, setRotation] = useState<number>(0);
  const [filterMode, setFilterMode] = useState<"scan" | "color" | "original">("scan");
  
  // Crop 框比例与位置控制 (% 比例 0-100)
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 5,
    y: 5,
    w: 90,
    h: 90,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);

  // 旋转90度
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 在 Canvas 上渲染预览与处理
  const renderCanvas = useCallback(() => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || !imgLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 根据旋转计算导出尺寸
    const isRotated90 = rotation === 90 || rotation === 270;
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;

    // 旋转后的外框尺寸
    const rotW = isRotated90 ? srcH : srcW;
    const rotH = isRotated90 ? srcW : srcH;

    // 计算根据 cropRect 裁剪的区域像素坐标
    const cropX = (cropRect.x / 100) * rotW;
    const cropY = (cropRect.y / 100) * rotH;
    const cropW = (cropRect.w / 100) * rotW;
    const cropH = (cropRect.h / 100) * rotH;

    canvas.width = Math.max(10, cropW);
    canvas.height = Math.max(10, cropH);

    ctx.save();
    // 平移并旋转 Canvas 坐标系
    ctx.translate(-cropX, -cropY);

    // 将图像根据中心旋转
    ctx.translate(rotW / 2, rotH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -srcW / 2, -srcH / 2);
    ctx.restore();

    // 图像滤镜处理
    if (filterMode === "scan") {
      // 白底黑字扫描增强滤镜
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // 转化为灰度
        let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // 增益对比度与高光平滑（去黄背景，压深文字墨迹）
        if (gray > 165) {
          gray = Math.min(255, gray * 1.2 + 20); // 背景强制压白
        } else {
          gray = Math.max(0, gray * 0.7 - 20); // 文字线条加深
        }

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(imgData, 0, 0);
    } else if (filterMode === "color") {
      // 彩色高对比度增强
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        // 提升 RGB 对比度
        data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.25 + 135));
        data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.25 + 135));
        data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.25 + 135));
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [rotation, filterMode, cropRect, imgLoaded]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onConfirm(blob);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-5 max-w-xl w-full shadow-2xl space-y-4 border border-amber-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-base text-gray-900">Scan & Enhance Image</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center justify-between flex-wrap gap-2 bg-amber-50/60 p-2.5 rounded-2xl border border-amber-100/60 text-xs">
          {/* Rotate Tool */}
          <button
            type="button"
            onClick={handleRotate}
            className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-violet-600" /> Rotate 90°
          </button>

          {/* Filter Modes */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setFilterMode("scan")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                filterMode === "scan"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sparkles className="w-3 h-3" /> White Scan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("color")}
              className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                filterMode === "color"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Sun className="w-3 h-3" /> Color Boost
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("original")}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                filterMode === "original"
                  ? "bg-violet-600 text-white shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Original
            </button>
          </div>
        </div>

        {/* Hidden original image loader */}
        <img
          ref={imageRef}
          src={imageSrc}
          alt="Source to enhance"
          className="hidden"
          onLoad={() => setImgLoaded(true)}
        />

        {/* Canvas Preview Box */}
        <div className="flex-1 min-h-[260px] bg-slate-900 rounded-2xl flex items-center justify-center p-3 relative overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-lg border border-slate-700"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {filterMode === "scan"
              ? "✨ Scan mode removes yellow shadows and deepens text."
              : "Original photo retained."}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" /> Apply & Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
