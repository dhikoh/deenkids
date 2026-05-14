"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Move } from "lucide-react";

interface Props {
  imageUrl: string;
  aspectRatio: string; // "16:9" | "9:16" | "1:1"
  onCrop: (croppedFile: File, croppedUrl: string) => void;
  onClose: () => void;
}

function getAspectValue(ratio: string): number {
  if (ratio === "16:9") return 16 / 9;
  if (ratio === "9:16") return 9 / 16;
  return 1;
}

export default function ImageCropModal({ imageUrl, aspectRatio, onCrop, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const ar = getAspectValue(aspectRatio);

  // Crop area dimensions (fixed in the preview)
  const CROP_W = aspectRatio === "9:16" ? 270 : aspectRatio === "1:1" ? 400 : 480;
  const CROP_H = Math.round(CROP_W / ar);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      // Auto-fit: scale image to cover the crop area
      const scaleX = CROP_W / img.width;
      const scaleY = CROP_H / img.height;
      const fitScale = Math.max(scaleX, scaleY);
      setScale(fitScale);
      setOffsetX((CROP_W - img.width * fitScale) / 2);
      setOffsetY((CROP_H - img.height * fitScale) / 2);
      setImgLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl, CROP_W, CROP_H]);

  // Draw preview
  useEffect(() => {
    if (!imgLoaded || !imgRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    canvasRef.current.width = CROP_W;
    canvasRef.current.height = CROP_H;

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, CROP_W, CROP_H);

    // Draw image with offset and scale
    const img = imgRef.current;
    ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);

    // Draw crop border
    ctx.strokeStyle = "rgba(139, 92, 246, 0.8)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(1, 1, CROP_W - 2, CROP_H - 2);
    ctx.setLineDash([]);

    // Draw grid (rule of thirds)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo((CROP_W / 3) * i, 0);
      ctx.lineTo((CROP_W / 3) * i, CROP_H);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, (CROP_H / 3) * i);
      ctx.lineTo(CROP_W, (CROP_H / 3) * i);
      ctx.stroke();
    }
  }, [imgLoaded, scale, offsetX, offsetY, CROP_W, CROP_H]);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    setOffsetX(e.clientX - dragStart.x);
    setOffsetY(e.clientY - dragStart.y);
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Touch drag handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offsetX, y: t.clientY - offsetY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffsetX(t.clientX - dragStart.x);
    setOffsetY(t.clientY - dragStart.y);
  };

  // Zoom
  const zoomIn = () => setScale(s => Math.min(s * 1.15, 5));
  const zoomOut = () => setScale(s => Math.max(s / 1.15, 0.1));
  const resetZoom = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const scaleX = CROP_W / img.width;
    const scaleY = CROP_H / img.height;
    const fitScale = Math.max(scaleX, scaleY);
    setScale(fitScale);
    setOffsetX((CROP_W - img.width * fitScale) / 2);
    setOffsetY((CROP_H - img.height * fitScale) / 2);
  };

  // Scroll zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // Apply crop
  const applyCrop = () => {
    if (!imgRef.current) return;
    const outW = aspectRatio === "9:16" ? 1080 : aspectRatio === "1:1" ? 1080 : 1920;
    const outH = Math.round(outW / ar);

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Scale factor from preview to export
    const exportScale = outW / CROP_W;
    const img = imgRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(
      img,
      offsetX * exportScale,
      offsetY * exportScale,
      img.width * scale * exportScale,
      img.height * scale * exportScale,
    );

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `cropped-${Date.now()}.png`, { type: "image/png" });
      const url = URL.createObjectURL(blob);
      onCrop(file, url);
    }, "image/png", 0.95);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            ✂️ Crop Gambar — {aspectRatio}
            <span className="text-[10px] font-normal text-slate-400 ml-1">
              Output: {aspectRatio === "9:16" ? "1080×1920" : aspectRatio === "1:1" ? "1080×1080" : "1920×1080"}px
            </span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="bg-slate-900 flex items-center justify-center p-4" style={{ minHeight: 300 }}>
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              width={CROP_W}
              height={CROP_H}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setDragging(false)}
              onWheel={handleWheel}
              className="cursor-grab active:cursor-grabbing rounded-lg"
              style={{ maxWidth: "100%", maxHeight: "400px" }}
            />
          ) : (
            <p className="text-slate-400 text-sm">Memuat gambar...</p>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button onClick={zoomOut} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-all" title="Zoom Out">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs font-bold text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-all" title="Zoom In">
                <ZoomIn size={16} />
              </button>
              <button onClick={resetZoom} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-all" title="Reset">
                <RotateCcw size={16} />
              </button>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 ml-2">
                <Move size={12} /> Drag untuk geser
              </span>
              {imgRef.current && (
                <span className="text-[10px] text-slate-400 ml-2 hidden sm:inline">
                  Asli: {imgRef.current.naturalWidth}×{imgRef.current.naturalHeight}px
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onClose} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-all">
                Batal
              </button>
              <button onClick={applyCrop} className="flex items-center gap-1 px-4 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-all shadow-md shadow-violet-200">
                <Check size={14} /> Terapkan Crop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
