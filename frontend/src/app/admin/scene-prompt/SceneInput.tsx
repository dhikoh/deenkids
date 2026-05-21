"use client";
import { useState } from "react";
import { Users, Plus, Trash2, ChevronDown, ChevronUp, Wand2, GripVertical, Trash } from "lucide-react";
import { SceneItem, CharacterCard } from "./types";

interface Props {
  scenes: SceneItem[];
  characters: CharacterCard[];
  onScenesChange: (scenes: SceneItem[]) => void;
  onCharactersChange: (chars: CharacterCard[]) => void;
}

/**
 * SceneInput — Pure scene text & character involvement editor.
 * Visual settings (camera, location, mood, etc.) have been moved to PromptOutput for a highly unified, prompt-adjacent workflow.
 */
export default function SceneInput({
  scenes,
  characters,
  onScenesChange,
  onCharactersChange,
}: Props) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [showCharacters, setShowCharacters] = useState(false);

  // ─── Scene Updates ───
  const updateScene = (i: number, patch: Partial<SceneItem>) => {
    onScenesChange(scenes.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  const removeScene = (i: number) => {
    onScenesChange(scenes.filter((_, idx) => idx !== i));
    if (expandedScene === i) setExpandedScene(null);
  };

  // ─── Character Management ───
  const addCharacter = () => {
    onCharactersChange([...characters, { id: `char-${Date.now()}`, name: "", description: "" }]);
  };

  const updateCharacter = (i: number, patch: Partial<CharacterCard>) => {
    onCharactersChange(characters.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  };

  const removeCharacter = (i: number) => {
    const charId = characters[i].id;
    onCharactersChange(characters.filter((_, idx) => idx !== i));
    onScenesChange(scenes.map(s => ({
      ...s,
      characterIds: s.characterIds.filter(id => id !== charId),
    })));
  };

  const toggleCharInScene = (sceneIdx: number, charId: string) => {
    const scene = scenes[sceneIdx];
    const has = scene.characterIds.includes(charId);
    updateScene(sceneIdx, {
      characterIds: has
        ? scene.characterIds.filter(id => id !== charId)
        : [...scene.characterIds, charId],
    });
  };

  return (
    <div className="space-y-4">
      {/* ─── Character Cards ─── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <button
          onClick={() => setShowCharacters(!showCharacters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-all border-b border-slate-100"
        >
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users size={14} className="text-violet-500" />
            Kartu Karakter ({characters.length})
          </span>
          {showCharacters ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {showCharacters && (
          <div className="px-4 py-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] text-slate-400 leading-normal mb-1">
              Definisikan karakter sekali → otomatis di-inject ke seluruh prompt scene yang melibatkan karakter ini untuk menjaga konsistensi visual.
            </p>
            {characters.map((char, i) => (
              <div key={char.id} className="flex gap-2 items-start group bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <div className="flex-1 space-y-1.5">
                  <input
                    value={char.name}
                    onChange={e => updateCharacter(i, { name: e.target.value })}
                    placeholder="Nama Karakter (misal: Ahmad)"
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-violet-400 outline-none font-bold placeholder:font-normal"
                  />
                  <textarea
                    value={char.description}
                    onChange={e => updateCharacter(i, { description: e.target.value })}
                    placeholder="Deskripsi fisik & pakaian (koko putih, peci hitam, dsb)"
                    rows={2}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-violet-400 outline-none resize-none placeholder:text-slate-300 leading-normal"
                  />
                </div>
                <button
                  onClick={() => removeCharacter(i)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 mt-1"
                  title="Hapus Karakter"
                >
                  <Trash size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addCharacter}
              className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-400 hover:text-violet-600 hover:border-violet-400 hover:bg-violet-50 transition-all flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Tambah Karakter baru
            </button>
          </div>
        )}
      </div>

      {/* ─── Scene List (pure editor) ─── */}
      {scenes.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-xl shadow-sm">
          <Wand2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-bold">Belum ada scene</p>
          <p className="text-xs text-slate-300 mt-1">
            Silakan masukkan narasi utuh di editor atas lalu klik &quot;Pecah & Buat Scene&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {scenes.map((scene, i) => {
            const isExpanded = expandedScene === i;

            return (
              <div key={scene.id} className="border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all shadow-sm">
                {/* Scene header */}
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => setExpandedScene(isExpanded ? null : i)}
                >
                  <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded flex-shrink-0">{i + 1}</span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded flex-shrink-0">
                    {scene.sentenceIds.length} kalimat
                  </span>
                  <p className="flex-1 text-[11px] text-slate-600 truncate">{scene.narration}</p>
                  <button 
                    onClick={e => { e.stopPropagation(); removeScene(i); }} 
                    className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all"
                    title="Hapus Scene"
                  >
                    <Trash2 size={12} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {/* Expanded scene settings */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100 space-y-3.5 pt-3 animate-in slide-in-from-top-1 duration-150">
                    {/* Narration edit area */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">
                        Edit Kalimat/Narasi Scene
                      </label>
                      <textarea
                        value={scene.narration}
                        onChange={e => updateScene(i, { narration: e.target.value })}
                        rows={3}
                        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:border-violet-400 outline-none resize-none font-medium leading-relaxed"
                      />
                    </div>

                    {/* Character Tagging */}
                    {characters.length > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                          Karakter yang Terlibat di Scene Ini
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {characters.filter(c => c.name.trim()).map(c => {
                            const isPresent = scene.characterIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                onClick={() => toggleCharInScene(i, c.id)}
                                className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                                  isPresent
                                    ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                                }`}
                              >
                                👤 {c.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
