"use client";
import { GripVertical, Trash2, Clock, Sparkles, Type, Crop, Plus, Image, Music } from "lucide-react";
import { SlideItem, TRANSITIONS } from "./types";
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
  onAddImages: (files: FileList) => void;
  onAddAudio: (file: File) => void;
  onRemoveAudio: () => void;
  totalDuration: number;
}

export default function SlideTimeline({
  slides, activeSlide, isProcessing, audio,
  onSelect, onReorder, onRemove, onUpdate, onCrop,
  onAddImages, onAddAudio, onRemoveAudio, totalDuration,
}: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOver(i); };
  const handleDrop = (i: number) => {
    if (dragIdx !== null && dragIdx !== i) onReorder(dragIdx, i);
    setDragIdx(null);
    setDragOver(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddImages(e.target.files);
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

  return (
    <div className="space-y-2">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioSelect} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          🎞️ Timeline ({slides.length} slide)
        </h3>
      </div>

      {/* Slides list */}
      {slides.length === 0 ? (
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isProcessing}
          className="w-full py-10 border-2 border-dashed border-violet-300 rounded-xl bg-violet-50/50 hover:bg-violet-100/50 transition-all group disabled:opacity-50"
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3 group-hover:bg-violet-200 transition-all">
              <Image size={24} className="text-violet-500" />
            </div>
            <p className="text-sm font-bold text-violet-600">Upload Gambar</p>
            <p className="text-[10px] text-violet-400 mt-1">Klik atau drag gambar ke sini</p>
          </div>
        </button>
      ) : (
        <>
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

                {/* Actions: Crop + Delete */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onCrop(i); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-violet-50 text-slate-300 hover:text-violet-500 transition-all"
                    title="Crop gambar"
                  >
                    <Crop size={14} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                    title="Hapus slide"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* ➕ Add Slide Button */}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-violet-400 hover:bg-violet-50 transition-all group flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center group-hover:bg-violet-200 transition-all">
              <Plus size={14} className="text-violet-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 group-hover:text-violet-600 transition-all">
              Tambah Slide
            </span>
          </button>
        </>
      )}

      {/* ─── Audio Section ─── */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        {audio ? (
          <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl">
            <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">🎵 Audio</p>
            <p className="text-xs text-slate-700 truncate">{audio.filename}</p>
            <audio controls className="w-full mt-2 h-8" preload="metadata">
              <source src={audio.objectUrl} />
            </audio>
            <button
              onClick={onRemoveAudio}
              className="text-[10px] text-rose-500 hover:underline mt-1"
            >
              Hapus audio
            </button>
          </div>
        ) : (
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50 transition-all group flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-all">
              <Music size={14} className="text-emerald-500" />
            </div>
            <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-600 transition-all">
              Tambah Audio
            </span>
          </button>
        )}
      </div>

      {/* ─── Duration Summary ─── */}
      {slides.length > 0 && (
        <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Total Durasi</p>
          <p className="text-lg font-bold text-slate-800">{totalDuration.toFixed(1)}s</p>
        </div>
      )}
    </div>
  );
}
