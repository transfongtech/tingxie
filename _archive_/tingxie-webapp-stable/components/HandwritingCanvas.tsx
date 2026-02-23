"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Eraser, RotateCcw, PenTool } from "lucide-react";
import { cn } from "@/lib/utils";

interface HandwritingCanvasProps {
    onStrokeEnd?: () => void;
    className?: string;
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
}

export interface HandwritingCanvasRef {
    clear: () => void;
    undo: () => void;
    isEmpty: () => boolean;
    getImageData: () => string | null; // Returns base64 string
}

export const HandwritingCanvas = forwardRef<HandwritingCanvasRef, HandwritingCanvasProps>(({
    onStrokeEnd,
    className,
    width = 800,
    height = 400,
    strokeColor = "#000000",
    strokeWidth = 4
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    const [currentStep, setCurrentStep] = useState(-1);

    useImperativeHandle(ref, () => ({
        clear: () => clear(),
        undo: () => undo(),
        isEmpty: () => history.length <= 1, // Basic check: only blank state exists or cleared
        getImageData: () => getImageData()
    }));

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Handle high DPI displays
        const dpr = window.devicePixelRatio || 1;

        // Use container width if responsive, otherwise prop width
        const rect = container.getBoundingClientRect();
        const displayWidth = rect.width || width;
        const displayHeight = height; // Fixed height for now, or could be responsive

        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;

        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        // Save initial blank state
        saveState();

        // Prevent default touch actions (scrolling) on the canvas
        const preventDefault = (e: TouchEvent) => {
            if (e.target === canvas) {
                e.preventDefault();
            }
        };

        // We need to add non-passive listener for touchmove to prevent scrolling
        canvas.addEventListener('touchmove', preventDefault, { passive: false });
        canvas.addEventListener('touchstart', preventDefault, { passive: false });
        canvas.addEventListener('touchend', preventDefault, { passive: false });

        // Resize handler using ResizeObserver
        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;

            // Use contentRect for precise dimensions
            const { width: newWidth } = entry.contentRect;

            // Only update if width meaningfully changed (avoid tiny fractions or loops)
            if (Math.abs(canvas.width - newWidth * dpr) > 1) {

                canvas.width = newWidth * dpr;
                canvas.height = displayHeight * dpr;
                canvas.style.width = `${newWidth}px`;
                canvas.style.height = `${displayHeight}px`;

                // CRITICAL: Restore context state after resize!
                // Canvas resizing clears context settings.
                ctx.scale(dpr, dpr);
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
            }
        });

        resizeObserver.observe(container);

        return () => {
            canvas.removeEventListener('touchmove', preventDefault);
            canvas.removeEventListener('touchstart', preventDefault);
            canvas.removeEventListener('touchend', preventDefault);
            resizeObserver.disconnect();
        };
    }, [width, height, strokeColor, strokeWidth]);

    const getPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if ('changedTouches' in e && e.changedTouches.length > 0) { // Should check changedTouches for touchend
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else if ('clientX' in e) {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        } else {
            return { x: 0, y: 0 };
        }

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const { x, y } = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const { x, y } = getPoint(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) ctx.closePath();

        saveState();
        if (onStrokeEnd) onStrokeEnd();
    };

    const saveState = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // We only save up to the current step (in case we undid)
        const newHistory = history.slice(0, currentStep + 1);
        newHistory.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

        // Limit history size if needed, e.g., to 20 steps
        if (newHistory.length > 20) {
            newHistory.shift();
        } else {
            // Step only increments if we didn't shift
            // Actually, step should point to the last index
        }

        setHistory(newHistory);
        setCurrentStep(newHistory.length - 1);
    };

    const undo = () => {
        if (currentStep <= 0) return; // Allow keeping the initial blank state? Or just verify logic.
        // If currentStep is 0 (blank state), we can't undo further if history[0] is blank.
        // Actually, let's say history[0] is blank. Drawing makes history[1]. Undo goes back to 0.

        const prevStep = currentStep - 1;
        if (prevStep < 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const imageData = history[prevStep];
        ctx.putImageData(imageData, 0, 0);
        setCurrentStep(prevStep);
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Reset to just one blank state
        const blankData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory([blankData]);
        setCurrentStep(0);
    };

    const getImageData = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        // Create a temporary canvas to composite with white background
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        if (!tempCtx) return null;

        // Fill with white
        tempCtx.fillStyle = "#FFFFFF";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw original canvas over white background
        tempCtx.drawImage(canvas, 0, 0);

        return tempCanvas.toDataURL("image/png");
    };

    // Expose methods via ref if we were using forwardRef, but here we'll just export controls via UI for now,
    // and maybe expose a method prop pattern if the parent needs to trigger it.
    // For now, let's keep buttons internal or allow parent to control via props? 
    // To keep it simple, I'll put the controls inside this component's UI,
    // but also allow `ref` to be passed if converted to forwardRef.
    // Let's attach the specific functions to the canvas element for "hacky" parent access if needed, 
    // or just rely on the parent accessing the canvas directly.
    // Actually, let's convert to `forwardRef` in the next iteration if needed. 
    // For now, I'll provide a 'ref' prop typed as `React.RefObject<HandwritingCanvasRef>` to allow parent binding.

    useEffect(() => {
        // If a ref object is passed (not forwardRef, just a prop named ref specifically or similar pattern),
        // functionality can be attached. 
        // But standard pattern is forwardRef. 
        // For simplicity in this file, I will just return the component with internal controls.
    }, []);

    return (
        <div className={cn("flex flex-col gap-2", className)} ref={containerRef}>
            <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm touch-none">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair w-full block bg-[url('/paper-texture.png')] bg-white" // optional texture
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ touchAction: 'none' }} // Critical for iPad
                />

                {/* Floating Controls */}
                <div className="absolute top-2 right-2 flex gap-2">
                    <button
                        onClick={undo}
                        disabled={currentStep <= 0}
                        className="p-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all"
                        title="Undo"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={clear}
                        className="p-2 bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
                        title="Clear"
                    >
                        <Eraser className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <div className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                <PenTool className="w-3 h-3" />
                <span>Write clearly within the box</span>
            </div>
        </div>
    );
});

HandwritingCanvas.displayName = "HandwritingCanvas";
