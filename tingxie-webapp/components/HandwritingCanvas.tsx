"use client";

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { Eraser, RotateCcw, PenTool, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

interface HandwritingCanvasProps {
    onStrokeEnd?: () => void;
    className?: string;
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
    onlyPen?: boolean;
    onOnlyPenToggle?: () => void;
}

export interface HandwritingCanvasRef {
    clear: () => void;
    isEmpty: () => boolean;
    getImageData: () => string | null; // Returns base64 string
}

export const HandwritingCanvas = forwardRef<HandwritingCanvasRef, HandwritingCanvasProps>(({
    onStrokeEnd,
    className,
    width = 800,
    height = 400,
    strokeColor = "#000000",
    strokeWidth = 4,
    onlyPen = false,
    onOnlyPenToggle
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDrawing = useRef(false); // Use Ref to avoid re-renders
    // State for Vector-Based History
    // We store strokes as arrays of points: { points: {x,y}[], color, width }
    interface Stroke {
        points: { x: number; y: number }[];
        color: string;
        width: number;
    }

    const [paths, setPaths] = useState<Stroke[]>([]);
    const pathsRef = useRef<Stroke[]>([]);
    const currentStroke = useRef<Stroke | null>(null);

    // We retain history for undo, but it's now just an array of Stroke objects (very lightweight)
    // No need for 'step' pointer unless we want Redo, but typically simple undo is enough.

    useImperativeHandle(ref, () => ({
        clear: () => clear(),
        isEmpty: () => paths.length === 0,
        getImageData: () => getImageData()
    }));

    // Redraw all saved paths - Memoized to be stable
    const redrawAll = useCallback((ctx: CanvasRenderingContext2D) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const drawStroke = (stroke: Stroke) => {
            if (!stroke || !stroke.points || stroke.points.length < 1) return;
            ctx.beginPath();
            ctx.lineWidth = stroke.width;
            ctx.strokeStyle = stroke.color;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const p0 = stroke.points[0];
            if (!p0 || !Number.isFinite(p0.x) || !Number.isFinite(p0.y)) return;
            ctx.moveTo(p0.x, p0.y);

            if (stroke.points.length === 1) {
                // Ensure single-point dots are visible in redraw
                ctx.lineTo(p0.x, p0.y);
            } else {
                for (let i = 1; i < stroke.points.length; i++) {
                    const p = stroke.points[i];
                    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                        ctx.lineTo(p.x, p.y);
                    }
                }
            }
            ctx.stroke();
        };

        pathsRef.current.forEach(drawStroke);

        // Also draw current active stroke if any (e.g. during resize)
        if (isDrawing.current && currentStroke.current) {
            drawStroke(currentStroke.current);
        }
    }, []); // Stable now because it uses pathsRef

    // Initialize canvas and Resize Observer
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        const displayWidth = rect.width || width;
        const displayHeight = height;

        // Set initial size
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;

        ctx.scale(dpr, dpr);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        // Initial draw
        redrawAll(ctx);

        const resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width: newWidth } = entry.contentRect;

            if (Math.abs(canvas.width - newWidth * dpr) > 1) {
                canvas.width = newWidth * dpr;
                canvas.height = displayHeight * dpr;
                canvas.style.width = `${newWidth}px`;
                canvas.style.height = `${displayHeight}px`;

                ctx.scale(dpr, dpr);
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;

                // Important: Redraw content after resize clears canvas
                redrawAll(ctx);
            }
        });

        resizeObserver.observe(container);

        return () => {
            resizeObserver.disconnect();
        };
    }, [width, height, strokeColor, strokeWidth, redrawAll]);

    const lastPos = useRef<{ x: number, y: number } | null>(null);
    const rectRef = useRef<DOMRect | null>(null);

    const updateRect = useCallback(() => {
        if (canvasRef.current) {
            rectRef.current = canvasRef.current.getBoundingClientRect();
        }
    }, []);

    // Update rect on resize and scroll
    useEffect(() => {
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
        }
    }, [updateRect]);

    const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement> | PointerEvent) => {
        if (!rectRef.current && canvasRef.current) {
            rectRef.current = canvasRef.current.getBoundingClientRect();
        }
        const rect = rectRef.current;
        if (!rect) return { x: 0, y: 0 };

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            return { x: 0, y: 0 };
        }
        return { x, y };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (onlyPen && e.pointerType !== 'pen') return;

        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawing.current = true;

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        updateRect();

        const { x, y } = getPoint(e);
        lastPos.current = { x, y };

        currentStroke.current = {
            points: [{ x, y }],
            color: strokeColor,
            width: strokeWidth
        };

        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }, [onlyPen, strokeColor, strokeWidth, updateRect, getPoint]);

    const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current || !lastPos.current) return;
        if (onlyPen && e.pointerType !== 'pen') return;

        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;

        const nativeEvent = e.nativeEvent;
        const events = "getCoalescedEvents" in nativeEvent
            ? (nativeEvent as PointerEvent).getCoalescedEvents()
            : [nativeEvent];

        if (events.length === 0) return;

        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);

        events.forEach((event) => {
            const { x, y } = getPoint(event);
            ctx.lineTo(x, y);
            lastPos.current = { x, y };

            if (currentStroke.current) {
                currentStroke.current.points.push({ x, y });
            }
        });

        ctx.stroke();
    }, [onlyPen, getPoint]);

    const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing.current) return;
        if (onlyPen && e.pointerType !== 'pen') return;

        const { x, y } = getPoint(e);
        const ctx = canvasRef.current?.getContext("2d");

        if (ctx && lastPos.current && (lastPos.current.x !== x || lastPos.current.y !== y)) {
            ctx.beginPath();
            ctx.moveTo(lastPos.current.x, lastPos.current.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            if (currentStroke.current) {
                currentStroke.current.points.push({ x, y });
            }
        }

        if (ctx) ctx.closePath();

        // Commit stroke to history BEFORE marking isDrawing as false to prevent flash/vanishing
        if (currentStroke.current && currentStroke.current.points.length > 0) {
            const strokeToSave = {
                ...currentStroke.current,
                points: [...currentStroke.current.points] // Full clone
            };
            pathsRef.current = [...pathsRef.current, strokeToSave]; // Synchronous history update
            setPaths([...pathsRef.current]); // Trigger re-render
            currentStroke.current = null;
        }

        isDrawing.current = false;
        lastPos.current = null;
        if (e.pointerId !== undefined) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }

        if (onStrokeEnd) onStrokeEnd();
    }, [onlyPen, onStrokeEnd, getPoint]);

    const clear = () => {
        pathsRef.current = [];
        setPaths([]);
        const ctx = canvasRef.current?.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }
    };

    const getImageData = () => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) return null;
        tempCtx.fillStyle = "#FFFFFF";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);
        return tempCanvas.toDataURL("image/png");
    };

    return (
        <div className={cn("flex flex-col gap-2", className)} ref={containerRef}>
            <div className="relative border-2 border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm touch-none">
                <canvas
                    ref={canvasRef}
                    className="cursor-crosshair w-full block bg-[url('/paper-texture.png')] bg-white select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    // onPointerLeave disabled to avoid split strokes at edges
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        touchAction: 'none',
                        WebkitTouchCallout: 'none',
                        WebkitUserSelect: 'none',
                        userSelect: 'none'
                    }}
                />

                <div className="absolute top-2 right-2 flex gap-2">
                    <button
                        onClick={onOnlyPenToggle}
                        className={cn(
                            "p-2 border rounded-full shadow-sm transition-all",
                            onlyPen
                                ? "bg-indigo-600 border-indigo-600 text-white"
                                : "bg-white/90 border-slate-200 text-slate-400 hover:text-slate-600"
                        )}
                        title={onlyPen ? "Apple Pencil Mode On" : "Touch Drawing On"}
                    >
                        {onlyPen ? <PenTool className="w-4 h-4" /> : <Hand className="w-4 h-4" />}
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
                <span>{onlyPen ? "Apple Pencil Mode Active" : "Write clearly within the box"}</span>
            </div>
        </div>
    );
});

HandwritingCanvas.displayName = "HandwritingCanvas";
