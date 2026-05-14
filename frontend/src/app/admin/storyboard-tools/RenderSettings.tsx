"use client";
import { Settings, Monitor, Zap, Type } from "lucide-react";
import { SubtitleConfig, FONTS, FPS_OPTIONS, ASPECT_RATIOS } from "./types";

interface Props {
  fps: number;
  aspectRatio: string;
  subtitleConfig: SubtitleConfig;
  onFpsChange: (v: number) => void;
  onAspectChange: (v: string) => void;
  onSubtitleChange: (v: SubtitleConfig) => void;
}

export default function RenderSettings({ fps, aspectRatio, subtitleConfig, onFpsChange, onAspectChange, onSubtitleChange }: Props) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        <Settings size={14} className="text-violet-500" /> Pengaturan Render
      </h3>

      {/* Aspect Ratio */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">
          <Monitor size={12} className="inline mr-1" /> Aspek Rasio
        </label>
        <div className="grid grid-cols-3 gap-2">
          {ASPECT_RATIOS.map(ar => (
            <button
              key={ar.id}
              onClick={() => onAspectChange(ar.id)}
              className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                aspectRatio === ar.id
                  ? "border-violet-400 bg-violet-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-xs font-bold text-slate-700">{ar.name}</p>
              <p className="text-[10px] text-slate-400">{ar.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* FPS */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">
          <Zap size={12} className="inline mr-1" /> Frame Rate
        </label>
        <div className="flex gap-2">
          {FPS_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => onFpsChange(f)}
              className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${
                fps === f
                  ? "border-violet-400 bg-violet-50 text-violet-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
            >
              {f} FPS
            </button>
          ))}
        </div>
      </div>

      {/* Subtitle Config */}
      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
            <Type size={12} /> Subtitle / CC
          </label>
          <button
            onClick={() => onSubtitleChange({ ...subtitleConfig, enabled: !subtitleConfig.enabled })}
            className={`relative w-10 h-5 rounded-full transition-all ${subtitleConfig.enabled ? "bg-violet-500" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${subtitleConfig.enabled ? "translate-x-5" : ""}`} />
          </button>
        </div>

        {subtitleConfig.enabled && (
          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
            {/* Font */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Font</label>
              <select
                value={subtitleConfig.font}
                onChange={e => onSubtitleChange({ ...subtitleConfig, font: e.target.value })}
                className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
              >
                {FONTS.map(f => (
                  <option key={f.id} value={f.id}>{f.name} — {f.style}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ukuran</label>
              <div className="flex gap-1.5">
                {(['small', 'medium', 'large'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => onSubtitleChange({ ...subtitleConfig, fontSize: s })}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      subtitleConfig.fontSize === s
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {s === 'small' ? 'Kecil' : s === 'medium' ? 'Sedang' : 'Besar'}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Warna</label>
              <div className="flex gap-1.5">
                {[
                  { id: 'white', label: 'Putih', bg: 'bg-white border-slate-300', ring: 'ring-violet-400' },
                  { id: 'yellow', label: 'Kuning', bg: 'bg-yellow-400', ring: 'ring-yellow-500' },
                  { id: 'black', label: 'Hitam', bg: 'bg-slate-800', ring: 'ring-slate-600' },
                ].map(c => (
                  <button
                    key={c.id}
                    onClick={() => onSubtitleChange({ ...subtitleConfig, color: c.id })}
                    className={`w-7 h-7 rounded-full border-2 ${c.bg} transition-all ${
                      subtitleConfig.color === c.id ? `ring-2 ${c.ring} border-white` : "border-slate-200"
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Posisi</label>
              <div className="flex gap-1.5">
                {(['top', 'center', 'bottom'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => onSubtitleChange({ ...subtitleConfig, position: p })}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      subtitleConfig.position === p
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {p === 'top' ? 'Atas' : p === 'center' ? 'Tengah' : 'Bawah'}
                  </button>
                ))}
              </div>
            </div>

            {/* BG Style */}
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 mb-1">Background</label>
              <div className="flex gap-1.5">
                {([
                  { id: 'semi-transparent', label: 'Semi' },
                  { id: 'blur', label: 'Blur' },
                  { id: 'none', label: 'Tanpa' },
                ] as const).map(b => (
                  <button
                    key={b.id}
                    onClick={() => onSubtitleChange({ ...subtitleConfig, bgStyle: b.id as SubtitleConfig['bgStyle'] })}
                    className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                      subtitleConfig.bgStyle === b.id
                        ? "border-violet-400 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
