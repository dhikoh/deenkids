"use client";
import { useState } from "react";
import { Copy, Check, Image, Film, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import { SceneItem } from "./types";

interface Props {
  scenes: SceneItem[];
}

export default function PromptOutput({ scenes }: Props) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success("Prompt disalin!");
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => toast.error("Gagal menyalin"));
  };

  const handleCopyAll = () => {
    const allText = scenes.map((s, i) => {
      return `=== Scene ${i + 1} (${s.sentenceIds.length} kalimat) ===\n\n📝 Narasi:\n${s.narration}\n\n🖼️ Prompt Gambar:\n${s.imagePrompt}\n\n🎬 Prompt Animasi:\n${s.animationPrompt}`;
    }).join("\n\n" + "─".repeat(50) + "\n\n");
    handleCopy(allText, "all");
  };

  if (scenes.length === 0 || !scenes[0].imagePrompt) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Image size={28} className="text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-400">Prompt belum di-generate</p>
        <p className="text-xs text-slate-300 mt-1">Klik &quot;Generate Prompt&quot; untuk mulai</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with copy all */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          📋 Output ({scenes.length} scene)
        </h3>
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-[11px] font-bold text-violet-600 hover:bg-violet-100 transition-all"
        >
          {copiedKey === "all" ? <Check size={12} /> : <Copy size={12} />}
          Salin Semua
        </button>
      </div>

      {/* Scene prompt cards */}
      {scenes.map((scene, i) => {
        const isExpanded = expandedScene === i;
        const imgKey = `img-${i}`;
        const animKey = `anim-${i}`;

        return (
          <div key={scene.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
            {/* Scene header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-slate-50 to-white cursor-pointer hover:from-slate-100 transition-all"
              onClick={() => setExpandedScene(isExpanded ? null : i)}
            >
              <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">
                {i + 1}
              </span>
              <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                {scene.sentenceIds.length} kalimat
              </span>
              <p className="flex-1 text-[11px] text-slate-500 truncate">{scene.narration}</p>
              {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>

            {/* Expanded: show both prompts */}
            {isExpanded && (
              <div className="px-3 pb-3 space-y-3 border-t border-slate-100 pt-3 animate-in slide-in-from-top-1 duration-150">
                {/* Image Prompt */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-blue-700 uppercase flex items-center gap-1">
                      <Image size={11} /> Prompt Gambar
                    </span>
                    <button
                      onClick={() => handleCopy(scene.imagePrompt, imgKey)}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-blue-200 rounded-md text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-all"
                    >
                      {copiedKey === imgKey ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      {copiedKey === imgKey ? "Disalin!" : "Salin"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {scene.imagePrompt}
                  </p>
                </div>

                {/* Animation Prompt */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-violet-700 uppercase flex items-center gap-1">
                      <Film size={11} /> Prompt Animasi
                    </span>
                    <button
                      onClick={() => handleCopy(scene.animationPrompt, animKey)}
                      className="flex items-center gap-1 px-2 py-1 bg-white border border-violet-200 rounded-md text-[10px] font-bold text-violet-600 hover:bg-violet-50 transition-all"
                    >
                      {copiedKey === animKey ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                      {copiedKey === animKey ? "Disalin!" : "Salin"}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                    {scene.animationPrompt}
                  </p>
                </div>
              </div>
            )}

            {/* Collapsed: show mini preview */}
            {!isExpanded && scene.imagePrompt && (
              <div className="px-3 pb-2 flex gap-2">
                <span className="text-[9px] text-blue-400 truncate flex-1">🖼️ {scene.imagePrompt.slice(0, 80)}...</span>
                <span className="text-[9px] text-violet-400 truncate flex-1">🎬 {scene.animationPrompt.slice(0, 80)}...</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
