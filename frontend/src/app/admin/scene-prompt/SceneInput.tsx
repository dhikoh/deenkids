"use client";
import { useState } from "react";
import {
  Camera, Cloud, MapPin, Clock, Film, Users, Plus, Trash2, ChevronDown, ChevronUp,
  Wand2, Merge, CheckSquare, Square, GripVertical,
} from "lucide-react";
import {
  SceneItem, SentenceItem, CharacterCard,
  CAMERA_PRESETS, MOOD_PRESETS, LOCATION_PRESETS, TIME_PRESETS,
  ANIMATION_PRESETS,
} from "./types";

interface Props {
  sentences: SentenceItem[];
  scenes: SceneItem[];
  characters: CharacterCard[];
  onSentencesChange: (sentences: SentenceItem[]) => void;
  onScenesChange: (scenes: SceneItem[]) => void;
  onCharactersChange: (chars: CharacterCard[]) => void;
  onMergeSelected: () => void;
}

export default function SceneInput({
  sentences, scenes, characters,
  onSentencesChange, onScenesChange, onCharactersChange, onMergeSelected,
}: Props) {
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [showCharacters, setShowCharacters] = useState(false);

  const selectedCount = sentences.filter(s => s.selected).length;

  // ─── Sentence Selection ───
  const toggleSentence = (id: string) => {
    onSentencesChange(sentences.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
  };

  const selectAll = () => {
    const allSelected = sentences.every(s => s.selected);
    onSentencesChange(sentences.map(s => ({ ...s, selected: !allSelected })));
  };

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

  const PresetButton = ({ active, onClick, children, className = "" }: { active: boolean; onClick: () => void; children: React.ReactNode; className?: string }) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
        active
          ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
      } ${className}`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* ─── Character Cards (Collapsible) ─── */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCharacters(!showCharacters)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-white hover:from-slate-100 transition-all"
        >
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Users size={14} className="text-violet-500" />
            Kartu Karakter ({characters.length})
          </span>
          {showCharacters ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>

        {showCharacters && (
          <div className="px-4 pb-4 space-y-2 border-t border-slate-100 pt-3 animate-in slide-in-from-top-2 duration-200">
            <p className="text-[10px] text-slate-400 mb-2">Definisikan karakter sekali → otomatis di-inject ke semua prompt scene yang melibatkan karakter ini.</p>
            {characters.map((char, i) => (
              <div key={char.id} className="flex gap-2 items-start group">
                <div className="flex-1 space-y-1">
                  <input
                    value={char.name}
                    onChange={e => updateCharacter(i, { name: e.target.value })}
                    placeholder="Nama (misal: Ahmad)"
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-violet-400 outline-none font-bold placeholder:font-normal"
                  />
                  <textarea
                    value={char.description}
                    onChange={e => updateCharacter(i, { description: e.target.value })}
                    placeholder="Deskripsi visual (misal: anak laki-laki 7 tahun, kulit sawo matang, baju koko putih, peci hitam)"
                    rows={2}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-violet-400 outline-none resize-none placeholder:text-slate-300"
                  />
                </div>
                <button
                  onClick={() => removeCharacter(i)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100 mt-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              onClick={addCharacter}
              className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-400 hover:text-violet-600 hover:border-violet-400 hover:bg-violet-50 transition-all flex items-center justify-center gap-1"
            >
              <Plus size={12} /> Tambah Karakter
            </button>
          </div>
        )}
      </div>

      {/* ─── Sentence List (for merging) ─── */}
      {sentences.length > 0 && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              📝 Kalimat ({sentences.length}) — pilih & gabung jadi scene
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="text-[10px] font-bold text-slate-500 hover:text-violet-600 transition-all"
              >
                {sentences.every(s => s.selected) ? 'Batal Semua' : 'Pilih Semua'}
              </button>
              {selectedCount >= 1 && (
                <button
                  onClick={onMergeSelected}
                  className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm"
                >
                  <Merge size={11} />
                  Gabung {selectedCount} kalimat → 1 Scene
                </button>
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {sentences.map((sentence) => (
              <label
                key={sentence.id}
                className={`flex items-start gap-2 px-4 py-2.5 cursor-pointer transition-all hover:bg-slate-50 ${
                  sentence.selected ? 'bg-violet-50/50' : ''
                }`}
              >
                <button
                  onClick={(e) => { e.preventDefault(); toggleSentence(sentence.id); }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {sentence.selected
                    ? <CheckSquare size={14} className="text-violet-600" />
                    : <Square size={14} className="text-slate-300" />
                  }
                </button>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5 flex-shrink-0 w-5">
                  {sentence.originalIndex + 1}
                </span>
                <span className="text-[11px] text-slate-600 leading-relaxed">{sentence.text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ─── Scene List ─── */}
      {scenes.length === 0 ? (
        <div className="text-center py-12">
          <Wand2 size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400 font-bold">Belum ada scene</p>
          <p className="text-xs text-slate-300 mt-1">
            {sentences.length > 0
              ? 'Pilih kalimat di atas, lalu klik "Gabung → 1 Scene"'
              : 'Paste narasi di atas, lalu klik "Pecah Jadi Kalimat"'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 px-1">
            🎬 Scene yang sudah dibuat ({scenes.length})
          </h4>
          {scenes.map((scene, i) => {
            const isExpanded = expandedScene === i;

            return (
              <div key={scene.id} className="border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-all">
                {/* Scene header */}
                <div
                  className="flex items-center gap-2 p-3 cursor-pointer"
                  onClick={() => setExpandedScene(isExpanded ? null : i)}
                >
                  <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
                  <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{i + 1}</span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                    {scene.sentenceIds.length} kalimat
                  </span>
                  <p className="flex-1 text-[11px] text-slate-600 truncate">{scene.narration}</p>
                  <button onClick={e => { e.stopPropagation(); removeScene(i); }} className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all">
                    <Trash2 size={12} />
                  </button>
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </div>

                {/* Expanded scene settings */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-slate-100 space-y-3 pt-3 animate-in slide-in-from-top-1 duration-150">
                    {/* Narration text edit */}
                    <textarea
                      value={scene.narration}
                      onChange={e => updateScene(i, { narration: e.target.value })}
                      rows={3}
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:border-violet-400 outline-none resize-none"
                    />

                    {/* Camera angle */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                        <Camera size={10} /> Sudut Kamera
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {CAMERA_PRESETS.map(c => (
                          <PresetButton key={c.id} active={scene.camera === c.id} onClick={() => updateScene(i, { camera: c.id })}>
                            {c.label}
                          </PresetButton>
                        ))}
                      </div>
                    </div>

                    {/* Mood */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                        <Cloud size={10} /> Suasana
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {MOOD_PRESETS.map(m => (
                          <PresetButton key={m.id} active={scene.mood === m.id} onClick={() => updateScene(i, { mood: m.id })}>
                            {m.emoji} {m.label}
                          </PresetButton>
                        ))}
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                        <MapPin size={10} /> Lokasi
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {LOCATION_PRESETS.map(l => (
                          <PresetButton key={l.id} active={scene.location === l.id} onClick={() => updateScene(i, { location: l.id })}>
                            {l.label}
                          </PresetButton>
                        ))}
                      </div>
                    </div>

                    {/* Time of day */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                        <Clock size={10} /> Waktu
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {TIME_PRESETS.map(t => (
                          <PresetButton key={t.id} active={scene.timeOfDay === t.id} onClick={() => updateScene(i, { timeOfDay: t.id })}>
                            {t.label}
                          </PresetButton>
                        ))}
                      </div>
                    </div>

                    {/* Animation motion */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                        <Film size={10} /> Gerakan Animasi
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {ANIMATION_PRESETS.map(a => (
                          <PresetButton key={a.id} active={scene.animationMotion === a.id} onClick={() => updateScene(i, { animationMotion: a.id })}>
                            {a.emoji} {a.label}
                          </PresetButton>
                        ))}
                      </div>
                    </div>

                    {/* Characters in scene */}
                    {characters.length > 0 && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 mb-1 block flex items-center gap-1">
                          <Users size={10} /> Karakter di Scene Ini
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {characters.filter(c => c.name.trim()).map(c => (
                            <PresetButton
                              key={c.id}
                              active={scene.characterIds.includes(c.id)}
                              onClick={() => toggleCharInScene(i, c.id)}
                            >
                              👤 {c.name}
                            </PresetButton>
                          ))}
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
