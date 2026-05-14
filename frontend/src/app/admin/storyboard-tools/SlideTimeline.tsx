"use client";
import { GripVertical, Trash2, Clock, Sparkles, Type } from "lucide-react";
import { SlideItem, TRANSITIONS } from "./types";
import { useState, useRef } from "react";

interface Props {
  slides: SlideItem[];
  activeSlide: number;
  onSelect: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, patch: Partial<SlideItem>) => void;
}

export default function SlideTimeline({ slides, activeSlide, onSelect, onReorder, onRemove, onUpdate }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (i: number) => {
    if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null);
    setDragOver(null);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
        🎞️ Timeline ({slides.length} slide)
      </h3>
      {slides.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-8">Upload gambar untuk mulai membuat storyboard</p>
      )}
      {slides.map((slide, i) => (
        <div
          key={slide.id}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
          onClick={() => onSelect(i)}
          className={`group relative rounded-xl border-2 p-3 cursor-pointer transition-all ${
            activeSlide === i
              ? "border-violet-400 bg-violet-50/50 shadow-md shadow-violet-100"
              : dragOver === i
              ? "border-blue-300 bg-blue-50"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
          }`}
        >
          <div className="flex items-start gap-3">
            {/* Drag handle */}
            <div className="pt-1 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
              <GripVertical size={16} />
            </div>

            {/* Thumbnail */}
            <div className="w-16 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
              <img src={slide.objectUrl} alt={slide.filename} className="w-full h-full object-cover" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">Slide {i + 1}</p>
              <p className="text-[10px] text-slate-400 truncate">{slide.filename}</p>

              {/* Duration slider */}
              <div className="flex items-center gap-2 mt-1.5">
                <Clock size={12} className="text-slate-400 flex-shrink-0" />
                <input
                  type="range" min={1} max={30} step={0.5}
                  value={slide.duration}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); onUpdate(i, { duration: parseFloat(e.target.value) }); }}
                  className="flex-1 h-1 accent-violet-500"
                />
                <span className="text-[10px] font-bold text-violet-600 w-8 text-right">{slide.duration}s</span>
              </div>

              {/* Transition select */}
              <div className="flex items-center gap-2 mt-1">
                <Sparkles size={12} className="text-slate-400 flex-shrink-0" />
                <select
                  value={slide.transition}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); onUpdate(i, { transition: e.target.value }); }}
                  className="flex-1 text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white focus:border-violet-400 outline-none"
                >
                  {TRANSITIONS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Subtitle input */}
              <div className="flex items-center gap-2 mt-1">
                <Type size={12} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Subtitle teks..."
                  value={slide.subtitle}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => { e.stopPropagation(); onUpdate(i, { subtitle: e.target.value }); }}
                  className="flex-1 text-[10px] border border-slate-200 rounded-md px-1.5 py-0.5 bg-white focus:border-violet-400 outline-none placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Delete */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(i); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
