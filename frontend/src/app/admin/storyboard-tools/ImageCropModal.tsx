"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Move, AlertTriangle } from "lucide-react";

interface Props {
  imageUrl: string;
  aspectRatio: string; // "16:9" | "9:16" | "1:1"
  /** Original MIME type of the file (e.g. "image/jpeg", "image/png", "image/webp") */
  originalMimeType?: string;
  onCrop: (croppedFile: File, croppedUrl: string) => void;
  onClose: () => void;
}

function getAspectValue(ratio: string): number {
  if (ratio === "16:9") return 16 / 9;
  if (ratio === "9:16") return 9 / 16;
  return 1;
}

/** Map MIME type to canvas-compatible format */
function getExportFormat(mime?: string): { type: string; ext: string; quality: number } {
  if (mime === "image/webp") return { type: "image/webp", ext: "webp", quality: 1.0 };
  if (mime === "image/png") return { type: "image/png", ext: "png", quality: 1.0 }; // PNG ignores quality param
  // Default: JPEG at maximum quality
  return { type: "image/jpeg", ext: "jpg", quality: 1.0 };
}

const MAX_EXPORT_DIM = 3840; // Cap at 4K to prevent excessive file size

export default function ImageCropModal({ imageUrl, aspectRatio, originalMimeType, onCrop, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [outputInfo, setOutputInfo] = useState("");

  const ar = getAspectValue(aspectRatio);
  const exportFmt = getExportFormat(originalMimeType);

  // Crop area dimensions (fixed in the preview)
  const CROP_W = aspectRatio === "9:16" ? 270 : aspectRatio === "1:1" ? 400 : 480;
  const CROP_H = Math.round(CROP_W / ar);

  // Load image
  useEffect(() => {
    const img = new window.Image();
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

  // Compute output resolution info
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    const { outW, outH } = computeExportDimensions();
    setOutputInfo(`${outW}×${outH}px (${exportFmt.ext.toUpperCase()})`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgLoaded, scale, offsetX, offsetY, CROP_W, CROP_H]);

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
  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offsetX, y: t.clientY - offsetY });
  }, [offsetX, offsetY]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const t = e.touches[0];
    setOffsetX(t.clientX - dragStart.x);
    setOffsetY(t.clientY - dragStart.y);
  }, [dragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
  }, []);

  // Zoom
  const zoomIn = useCallback(() => setScale(s => Math.min(s * 1.15, 5)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s / 1.15, 0.1)), []);
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

  // Scroll zoom (native handler to avoid passive listener issue)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) setScale(s => Math.min(s * 1.15, 5));
    else setScale(s => Math.max(s / 1.15, 0.1));
  }, []);

  // Attach touch/wheel listeners with { passive: false } to allow preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd]);

  /**
   * Compute export dimensions at NATIVE resolution.
   * Maps the preview crop area back to original image coordinates,
   * then exports at native resolution (capped at 4K).
   */
  const computeExportDimensions = () => {
    if (!imgRef.current) return { outW: 0, outH: 0, srcX: 0, srcY: 0, srcW: 0, srcH: 0 };
    const img = imgRef.current;

    // In the preview canvas, the image is drawn at:
    //   x: offsetX, y: offsetY, width: img.width * scale, height: img.height * scale
    // The crop area is the entire canvas (0,0 → CROP_W, CROP_H)
    //
    // To find the crop region in original image coordinates:
    //   srcX = -offsetX / scale
    //   srcY = -offsetY / scale
    //   srcW = CROP_W / scale
    //   srcH = CROP_H / scale

    const srcX = -offsetX / scale;
    const srcY = -offsetY / scale;
    const srcW = CROP_W / scale;
    const srcH = CROP_H / scale;

    // Output at native crop resolution, capped at MAX_EXPORT_DIM
    let outW = Math.round(srcW);
    let outH = Math.round(srcH);

    // Cap to prevent absurdly large exports
    if (outW > MAX_EXPORT_DIM || outH > MAX_EXPORT_DIM) {
      const downscale = MAX_EXPORT_DIM / Math.max(outW, outH);
      outW = Math.round(outW * downscale);
      outH = Math.round(outH * downscale);
    }

    // Ensure minimum size (at least 100px)
    outW = Math.max(100, outW);
    outH = Math.max(100, outH);

    return { outW, outH, srcX, srcY, srcW, srcH };
  };

  // Apply crop — exports at NATIVE resolution, preserving original format
  const applyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const { outW, outH, srcX, srcY, srcW, srcH } = computeExportDimensions();

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = outW;
    exportCanvas.height = outH;
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Fill background (for any out-of-bounds areas)
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, outH);

    // Draw the crop region from the original image directly
    // drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    ctx.drawImage(
      img,
      Math.max(0, srcX),      // source x (clamped)
      Math.max(0, srcY),      // source y (clamped)
      Math.min(srcW, img.naturalWidth - Math.max(0, srcX)),   // source width
      Math.min(srcH, img.naturalHeight - Math.max(0, srcY)),  // source height
      srcX < 0 ? (-srcX / srcW) * outW : 0,   // dest x offset for out-of-bounds
      srcY < 0 ? (-srcY / srcH) * outH : 0,   // dest y offset for out-of-bounds
      srcX < 0 ? outW * (1 + srcX / srcW) : outW,  // dest width
      srcY < 0 ? outH * (1 + srcY / srcH) : outH,  // dest height
    );

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `cropped-${Date.now()}.${exportFmt.ext}`, { type: exportFmt.type });
      const url = URL.createObjectURL(blob);
      onCrop(file, url);
    }, exportFmt.type, exportFmt.quality);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[600px] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            ✂️ Crop Gambar — {aspectRatio}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Quality info banner */}
        <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
          <span className="text-[10px] font-bold text-emerald-700">🔒 Kualitas Penuh</span>
          <span className="text-[10px] text-emerald-600">
            Export di resolusi asli • Format: {exportFmt.ext.toUpperCase()} • Quality: {exportFmt.quality === 1.0 ? "Lossless/Max" : `${exportFmt.quality * 100}%`}
          </span>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="bg-slate-900 flex items-center justify-center p-4" style={{ minHeight: 300 }}>
          {imgLoaded ? (
            <canvas
              ref={canvasRef}
              width={CROP_W}
              height={CROP_H}
              onMouseDown={handleMouseDown}
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
          {/* Resolution info */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {imgRef.current && `Asli: ${imgRef.current.naturalWidth}×${imgRef.current.naturalHeight}px`}
            </span>
            <span className="font-bold text-violet-500">
              Output: {outputInfo}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
