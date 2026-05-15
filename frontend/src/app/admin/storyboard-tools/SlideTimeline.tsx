"use client";
import {
  GripVertical, Trash2, Clock, Sparkles, Type, Crop, Plus, Image, Music,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, Play, Film,
} from "lucide-react";
import { SlideItem, TRANSITIONS, ACCEPTED_MEDIA_TYPES } from "./types";
import { useState, useRef } from "react";

interface AudioInfo {
  filename: string;
  objectUrl: string;
}

interface Props {
  slides: SlideItem[];
  activeSlide: number;
  isProcessing: boolean;
  audio: AudioInfo | null;
  onSelect: (i: number) => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, patch: Partial<SlideItem>) => void;
  onCrop: (i: number) => void;
  onAddMedia: (files: FileList) => void;
  onAddAudio: (file: File) => void;
  onRemoveAudio: () => void;
  onPreviewTransition: (i: number) => void;
  totalDuration: number;
}

export default function SlideTimeline({
  slides, activeSlide, isProcessing, audio,
  onSelect, onReorder, onRemove, onUpdate, onCrop,
  onAddMedia, onAddAudio, onRemoveAudio, onPreviewTransition, totalDuration,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [expandedSlide, setExpandedSlide] = useState<number | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (i: number) => {
    if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null);
    setDragOver(null);
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddMedia(e.target.files);
      e.target.value = "";
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && f.type.startsWith("audio/")) {
      onAddAudio(f);
      e.target.value = "";
    }
  };

  const toggleExpand = (i: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSlide(expandedSlide === i ? null : i);
  };

  const moveSlide = (i: number, dir: -1 | 1, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = i + dir;
    if (target < 0 || target >= slides.length) return;
    onReorder(i, target);
    // Keep the moved slide selected
    onSelect(target);
  };

  return (
    <div>
      {/* Hidden file inputs */}
      <input ref={mediaInputRef} type="file" accept={ACCEPTED_MEDIA_TYPES} multiple className="hidden" onChange={handleMediaSelect} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          🎞️ Timeline
          <span className="text-[10px] font-normal text-slate-400 ml-1">({slides.length} slide)</span>
        </h3>
        {slides.length > 0 && (
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1 text-[10px] font-bold text-violet-600 hover:text-violet-700 transition-all disabled:opacity-50"
          >
            <Plus size={12} /> Tambah
          </button>
        )}
      </div>

      {/* Empty state */}
      {slides.length === 0 ? (
        <button
          onClick={() => mediaInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full py-10 border-2 border-dashed border-violet-300 rounded-xl bg-gradient-to-b from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 transition-all group disabled:opacity-50"
        >
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-200 to-purple-200 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-violet-100">
              <Image size={24} className="text-violet-600" />
            </div>
            <p className="text-sm font-bold text-violet-700">Upload Gambar / Video</p>
            <p className="text-[11px] text-violet-400 mt-1">JPG, PNG, WebP, MP4, WebM — bisa multiple</p>
          </div>
        </button>
      ) : (
        <div className="space-y-1.5">
          {slides.map((slide, i) => {
            const isExpanded = expandedSlide === i;
            const isActive = activeSlide === i;
            const isFirst = i === 0;
            const isLast = i === slides.length - 1;
            const transitionLabel = TRANSITIONS.find(t => t.id === slide.transition)?.name || slide.transition;
            const isVideo = slide.mediaType === 'video';

            return (
              <div
                key={slide.id}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => { setDragIdx(null); setDragOver(null); }}
                onClick={() => onSelect(i)}
                className={`group rounded-xl border transition-all ${
                  isActive
                    ? "border-violet-400 bg-violet-50/70 shadow-sm shadow-violet-100 ring-1 ring-violet-200"
                    : dragOver === i
                    ? "border-blue-300 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Compact row */}
                <div className="flex items-center gap-2 p-2">
                  {/* Reorder buttons (↑↓) */}
                  <div className="flex flex-col gap-0 flex-shrink-0">
                    <button
                      onClick={(e) => moveSlide(i, -1, e)}
                      disabled={isFirst || isProcessing}
                      className="p-0.5 rounded hover:bg-violet-100 text-slate-300 hover:text-violet-600 transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                      title="Geser ke atas"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={(e) => moveSlide(i, 1, e)}
                      disabled={isLast || isProcessing}
                      className="p-0.5 rounded hover:bg-violet-100 text-slate-300 hover:text-violet-600 transition-all disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-300"
                      title="Geser ke bawah"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>

                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing text-slate-200 hover:text-slate-400 flex-shrink-0 hidden sm:block" title="Drag untuk reorder">
                    <GripVertical size={12} />
                  </div>

                  {/* Thumbnail */}
                  <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200 relative">
                    <img src={isVideo ? (slide.videoThumbnailUrl || slide.objectUrl) : slide.objectUrl} alt="" className="w-full h-full object-cover" />
                    {/* Video badge overlay */}
                    {isVideo && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Film size={14} className="text-white drop-shadow" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? "bg-violet-200 text-violet-700" : "bg-slate-100 text-slate-500"}`}>
                        {i + 1}
                      </span>
                      {isVideo && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-600">
                          🎬 Video
                        </span>
                      )}
                      <span className="text-[10px] text-slate-500 font-medium">{slide.duration.toFixed(1)}s</span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <span className="text-[10px] text-slate-400 capitalize">{transitionLabel}</span>
                    </div>
                    {slide.subtitle && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[140px]">{slide.subtitle}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Crop button — only for images */}
                    {!isVideo && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onCrop(i); }}
                        className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-all"
                        title="Crop"
                      >
                        <Crop size={12} />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                      className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={12} />
                    </button>
                    <button
                      onClick={(e) => toggleExpand(i, e)}
                      className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
                      title="Detail"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 space-y-2 animate-in slide-in-from-top-1 duration-150">
                    {/* Duration — slider for images, read-only label for videos */}
                    <div className="flex items-center gap-2">
                      <Clock size={11} className="text-slate-400 flex-shrink-0" />
                      {isVideo ? (
                        <>
                          <p className="flex-1 text-[10px] text-slate-500">Durasi asli video (tidak bisa diubah)</p>
                          <span className="text-[10px] font-bold text-blue-600 w-7 text-right">{slide.duration.toFixed(1)}s</span>
                        </>
                      ) : (
                        <>
                          <input
                            type="range" min={1} max={30} step={0.5}
                            value={slide.duration}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => { e.stopPropagation(); onUpdate(i, { duration: parseFloat(e.target.value) }); }}
                            className="flex-1 h-1 accent-violet-500"
                          />
                          <span className="text-[10px] font-bold text-violet-600 w-7 text-right">{slide.duration}s</span>
                        </>
                      )}
                    </div>
                    {/* Transition + Preview button */}
                    <div className="flex items-center gap-2">
                      <Sparkles size={11} className="text-slate-400 flex-shrink-0" />
                      <select
                        value={slide.transition}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); onUpdate(i, { transition: e.target.value }); }}
                        className="flex-1 text-[10px] border border-slate-200 rounded-md px-2 py-1 bg-white focus:border-violet-400 outline-none"
                      >
                        {TRANSITIONS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      {/* Preview transition button */}
                      {!isLast && slide.transition !== "none" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onPreviewTransition(i); }}
                          disabled={isProcessing}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-200 rounded-md hover:bg-violet-100 hover:border-violet-300 transition-all disabled:opacity-50"
                          title="Preview transisi ke slide berikutnya"
                        >
                          <Play size={9} /> Lihat
                        </button>
                      )}
                    </div>
                    {/* Subtitle */}
                    <div className="flex items-center gap-2">
                      <Type size={11} className="text-slate-400 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Teks subtitle..."
                        value={slide.subtitle}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); onUpdate(i, { subtitle: e.target.value }); }}
                        className="flex-1 text-[10px] border border-slate-200 rounded-md px-2 py-1 bg-white focus:border-violet-400 outline-none placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add button (bottom) */}
          <button
            onClick={() => mediaInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:border-violet-400 hover:bg-violet-50 transition-all group flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Plus size={14} className="text-slate-400 group-hover:text-violet-500 transition-all" />
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-violet-600 transition-all">
              Tambah Slide
            </span>
          </button>
        </div>
      )}

      {/* Audio section */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        {audio ? (
          <div className="p-2.5 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">🎵 Audio</p>
              <button
                onClick={onRemoveAudio}
                className="text-[10px] text-rose-400 hover:text-rose-600 font-bold transition-all"
              >
                Hapus
              </button>
            </div>
            <p className="text-[10px] text-slate-600 truncate mb-1.5">{audio.filename}</p>
            <audio controls className="w-full h-7" preload="metadata" style={{ filter: "hue-rotate(260deg)" }}>
              <source src={audio.objectUrl} />
            </audio>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-2.5 border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:border-emerald-400 hover:bg-emerald-50 transition-all group flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Music size={14} className="text-slate-400 group-hover:text-emerald-500 transition-all" />
            <span className="text-[11px] font-bold text-slate-400 group-hover:text-emerald-600 transition-all">
              Tambah Audio
            </span>
          </button>
        )}
      </div>

      {/* Duration summary */}
      {slides.length > 0 && (
        <div className="mt-3 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Durasi</span>
          <span className="text-sm font-bold text-slate-700">{totalDuration.toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}
