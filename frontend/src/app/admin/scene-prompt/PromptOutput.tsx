"use client";
import { useState } from "react";
import { Copy, Check, Image, Film, ChevronDown, ChevronUp, Merge, CheckSquare, Square } from "lucide-react";
import toast from "react-hot-toast";
import { SceneItem } from "./types";

interface Props {
  scenes: SceneItem[];
  onMergeScenes: (selectedIndices: number[]) => void;
}

/**
 * PromptOutput — shows generated prompts with merge capability.
 * User can select 2+ adjacent scenes → merge → auto-regenerate.
 */
export default function PromptOutput({ scenes, onMergeScenes }: Props) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());

  const hasPrompts = scenes.length > 0 && !!scenes[0].imagePrompt;

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

  const toggleSceneSelection = (index: number) => {
    setSelectedScenes(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleMerge = () => {
    onMergeScenes(Array.from(selectedScenes));
    setSelectedScenes(new Set());
  };

  // ─── Empty state: no scenes yet ───
  if (scenes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Image size={28} className="text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-400">Belum ada scene</p>
        <p className="text-xs text-slate-300 mt-1">Pecah narasi terlebih dahulu</p>
      </div>
    );
  }

  // ─── Scenes exist but prompts not generated yet ───
  if (!hasPrompts) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
          <Image size={28} className="text-violet-300" />
        </div>
        <p className="text-sm font-bold text-slate-500">{scenes.length} scene siap</p>
        <p className="text-xs text-slate-400 mt-1">Klik &quot;Generate Prompt&quot; untuk membuat prompt gambar & animasi</p>
      </div>
    );
  }

  // ─── Prompts generated — show output with merge capability ───
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">
          📋 Output ({scenes.length} scene)
        </h3>
        <div className="flex items-center gap-2">
          {selectedScenes.size > 0 && (
            <button
              onClick={() => setSelectedScenes(new Set())}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-all"
            >
              Batal Pilih
            </button>
          )}
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg text-[11px] font-bold text-violet-600 hover:bg-violet-100 transition-all"
          >
            {copiedKey === "all" ? <Check size={12} /> : <Copy size={12} />}
            Salin Semua
          </button>
        </div>
      </div>

      {/* Merge bar — appears when 2+ scenes selected */}
      {selectedScenes.size >= 2 && (
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs font-bold text-violet-700">
            {selectedScenes.size} scene dipilih — harus berurutan
          </span>
          <button
            onClick={handleMerge}
            className="flex items-center gap-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Merge size={12} />
            Gabung → 1 Scene
          </button>
        </div>
      )}

      {/* Scene prompt cards */}
      {scenes.map((scene, i) => {
        const isExpanded = expandedScene === i;
        const isSelected = selectedScenes.has(i);
        const imgKey = `img-${i}`;
        const animKey = `anim-${i}`;

        return (
          <div key={scene.id} className={`border rounded-xl bg-white overflow-hidden transition-all ${
            isSelected ? 'border-violet-400 ring-1 ring-violet-200' : 'border-slate-200'
          }`}>
            {/* Scene header */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-slate-50 to-white">
              {/* Merge checkbox */}
              <button
                onClick={() => toggleSceneSelection(i)}
                className="flex-shrink-0"
                title="Pilih untuk digabung"
              >
                {isSelected
                  ? <CheckSquare size={14} className="text-violet-600" />
                  : <Square size={14} className="text-slate-300 hover:text-slate-400" />
                }
              </button>

              <div
                className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
                onClick={() => setExpandedScene(isExpanded ? null : i)}
              >
                <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex-shrink-0">
                  {scene.sentenceIds.length} kalimat
                </span>
                <p className="flex-1 text-[11px] text-slate-500 truncate">{scene.narration}</p>
              </div>

              <button onClick={() => setExpandedScene(isExpanded ? null : i)} className="flex-shrink-0">
                {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
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

      {/* Merge hint at bottom */}
      <p className="text-[9px] text-slate-400 text-center pt-2">
        💡 Centang 2+ scene berurutan → tombol &quot;Gabung&quot; muncul di atas. Prompt otomatis di-regenerate.
      </p>
    </div>
  );
}
