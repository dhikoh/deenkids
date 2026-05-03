"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";

interface ImageCropperModalProps {
  imageSrc: string;
  onCancel: () => void;
  onCropComplete: (blob: Blob) => void;
}

export default function ImageCropperModal({
  imageSrc,
  onCancel,
  onCropComplete,
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: { x: number; y: number }) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((zoom: number) => {
    setZoom(zoom);
  }, []);

  const onCropCompleteCallback = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (blob) {
        onCropComplete(blob);
      }
    } catch {
      // silently fail — caller handles toast
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">Sesuaikan Thumbnail</h3>
            <p className="text-xs text-slate-400 mt-0.5">Geser dan zoom untuk memilih area terbaik (rasio 16:9)</p>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Crop Canvas */}
        <div className="relative w-full bg-slate-900" style={{ height: "320px" }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
            showGrid={true}
            style={{
              containerStyle: { borderRadius: "0" },
              cropAreaStyle: { border: "2px solid #10b981", boxShadow: "0 0 0 9999em rgba(0,0,0,0.6)" },
            }}
          />
        </div>

        {/* Zoom Slider */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
            >
              <ZoomOut size={16} />
            </button>
            <div className="flex-1 relative">
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all"
            >
              <ZoomIn size={16} />
            </button>
            <span className="text-xs font-bold text-slate-500 w-10 text-right">{zoom.toFixed(1)}×</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 flex gap-3 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            disabled={isProcessing}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Check size={18} />
            )}
            {isProcessing ? "Memproses..." : "Potong & Gunakan"}
          </button>
        </div>
      </div>
    </div>
  );
}
