"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  Clapperboard, Sparkles, Palette, Monitor, ChevronDown, ChevronUp, Layers, Baby,
} from "lucide-react";
import {
  SceneItem, SentenceItem, CharacterCard, VisualStyle,
  VISUAL_STYLE_PRESETS, ART_STYLES, RENDERINGS, COLOR_MOODS,
  SCENE_ASPECT_RATIOS, PLATFORM_TARGETS, AGE_TARGETS, DEFAULT_AGE_TARGET,
} from "./types";
import { splitIntoSentences, generateAllPrompts, detectSceneCategory, autoDetectPresets } from "./prompt-engine";
import SceneInput from "./SceneInput";
import PromptOutput from "./PromptOutput";

export default function ScenePromptStudioPage() {
  // ─── State ───
  const [rawText, setRawText] = useState("");
  const [sentences, setSentences] = useState<SentenceItem[]>([]);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);

  // Visual style
  const [visualPresetId, setVisualPresetId] = useState("adably-kids");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [customStyle, setCustomStyle] = useState<VisualStyle>({
    artStyle: "childrens-book",
    rendering: "soft-dreamy",
    colorMood: "warm-pastel",
  });

  // Settings
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [platformId, setPlatformId] = useState("runway");
  const [showSettings, setShowSettings] = useState(false);
  const [backToCamera, setBackToCamera] = useState(false);
  const [selectedAges, setSelectedAges] = useState<string[]>([DEFAULT_AGE_TARGET]);

  const isCustom = visualPresetId === "custom";

  // ─── Split Narration into Sentences ───
  const handleSplitSentences = () => {
    if (!rawText.trim()) {
      toast.error("Masukkan narasi terlebih dahulu");
      return;
    }

    const extracted = splitIntoSentences(rawText);
    if (extracted.length === 0) {
      toast.error("Tidak ditemukan kalimat yang bisa dipecah");
      return;
    }

    const newSentences: SentenceItem[] = extracted.map((text, i) => ({
      id: `sent-${Date.now()}-${i}`,
      text,
      originalIndex: i,
      selected: false,
    }));

    setSentences(newSentences);
    toast.success(`${newSentences.length} kalimat berhasil dipecah`);
  };

  // ─── Merge Selected Sentences into a Scene ───
  const handleMergeSelected = () => {
    const selected = sentences.filter(s => s.selected);
    if (selected.length === 0) {
      toast.error("Pilih minimal 1 kalimat untuk digabung");
      return;
    }

    // Sort by original index to maintain order
    const sorted = [...selected].sort((a, b) => a.originalIndex - b.originalIndex);
    const mergedText = sorted.map(s => s.text).join(" ");
    const category = detectSceneCategory(mergedText);
    const presets = autoDetectPresets(mergedText, category);

    const newScene: SceneItem = {
      id: `scene-${Date.now()}`,
      narration: mergedText,
      sentenceIds: sorted.map(s => s.id),
      camera: presets.camera,
      mood: presets.mood,
      location: presets.location,
      timeOfDay: presets.timeOfDay,
      animationMotion: "ambient",
      imagePrompt: "",
      animationPrompt: "",
      characterIds: [],
      backToCamera,
    };

    setScenes(prev => [...prev, newScene]);

    // Deselect merged sentences
    setSentences(prev => prev.map(s => selected.find(sel => sel.id === s.id) ? { ...s, selected: false } : s));
    toast.success(`${selected.length} kalimat digabung → Scene ${scenes.length + 1}`);
  };

  // ─── Auto-merge: each sentence becomes 1 scene ───
  const handleAutoMerge = () => {
    if (sentences.length === 0) {
      toast.error("Pecah narasi menjadi kalimat terlebih dahulu");
      return;
    }

    const newScenes: SceneItem[] = sentences.map((s) => {
      const category = detectSceneCategory(s.text);
      const presets = autoDetectPresets(s.text, category);
      return {
        id: `scene-${Date.now()}-${s.originalIndex}`,
        narration: s.text,
        sentenceIds: [s.id],
        camera: presets.camera,
        mood: presets.mood,
        location: presets.location,
        timeOfDay: presets.timeOfDay,
        animationMotion: "ambient",
        imagePrompt: "",
        animationPrompt: "",
        characterIds: [],
        backToCamera,
      };
    });

    setScenes(newScenes);
    toast.success(`${newScenes.length} scene otomatis dari ${sentences.length} kalimat`);
  };

  // ─── Toggle Age Selection ───
  const toggleAge = (ageId: string) => {
    setSelectedAges(prev => {
      if (prev.includes(ageId)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== ageId);
      }
      return [...prev, ageId];
    });
  };

  // ─── Generate All Prompts ───
  const handleGenerate = () => {
    if (scenes.length === 0) {
      toast.error("Buat scene terlebih dahulu (gabung kalimat)");
      return;
    }

    const updated = generateAllPrompts(
      scenes,
      rawText,
      visualPresetId,
      isCustom ? customStyle : undefined,
      characters,
      aspectRatio,
      platformId,
      selectedAges,
    );

    setScenes(updated);
    toast.success(`🎬 ${updated.length} prompt berhasil di-generate!`);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clapperboard className="h-6 w-6 text-violet-600" /> Scene Prompt Studio
            <span className="text-xs font-normal bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">v3</span>
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Generate prompt gambar & animasi — split per kalimat, gabung sesuai kebutuhan</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={scenes.length === 0}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 transition-all disabled:opacity-50"
        >
          <Sparkles size={16} />
          Generate Prompt ({scenes.length} scene)
        </button>
      </div>

      {/* ─── Visual Style + Age Section ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        {/* Visual Style */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
            <Palette size={14} className="text-violet-500" /> Gaya Visual
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
            {VISUAL_STYLE_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => { setVisualPresetId(preset.id); setShowCustomStyle(false); }}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  visualPresetId === preset.id
                    ? "border-violet-400 shadow-sm ring-1 ring-violet-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.colorClass} flex items-center justify-center mx-auto mb-1.5 text-lg`}>
                  {preset.emoji}
                </div>
                <p className="text-[11px] font-bold text-slate-700">{preset.name}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{preset.description}</p>
              </button>
            ))}

            {/* Custom option */}
            <button
              onClick={() => { setVisualPresetId("custom"); setShowCustomStyle(true); }}
              className={`p-3 rounded-xl border-2 text-center transition-all ${
                isCustom
                  ? "border-violet-400 shadow-sm ring-1 ring-violet-200"
                  : "border-dashed border-slate-300 hover:border-slate-400"
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-1.5 text-lg">
                🎛️
              </div>
              <p className="text-[11px] font-bold text-slate-700">Custom</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Pilih sendiri</p>
            </button>
          </div>

          {/* Custom style dropdowns */}
          {showCustomStyle && isCustom && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Art Style</label>
                <select
                  value={customStyle.artStyle}
                  onChange={e => setCustomStyle({ ...customStyle, artStyle: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                >
                  {ART_STYLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Rendering</label>
                <select
                  value={customStyle.rendering}
                  onChange={e => setCustomStyle({ ...customStyle, rendering: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                >
                  {RENDERINGS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 mb-1 block">Color Mood</label>
                <select
                  value={customStyle.colorMood}
                  onChange={e => setCustomStyle({ ...customStyle, colorMood: e.target.value })}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                >
                  {COLOR_MOODS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Age Target */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
            <Baby size={14} className="text-violet-500" /> Target Usia
          </h3>
          <p className="text-[10px] text-slate-400 mb-3">Pilih 1 atau lebih. Mempengaruhi gaya visual & kompleksitas.</p>
          <div className="space-y-2">
            {AGE_TARGETS.map(age => (
              <button
                key={age.id}
                onClick={() => toggleAge(age.id)}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  selectedAges.includes(age.id)
                    ? "border-violet-400 bg-violet-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">{age.label}</span>
                  {selectedAges.includes(age.id) && (
                    <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded">✓</span>
                  )}
                </div>
                <p className="text-[9px] text-slate-400 mt-0.5">{age.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Layout: 2 columns ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Panel */}
        <div className="lg:col-span-5 space-y-4">
          {/* Narration input + split */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              📝 Narasi / Naskah
            </h3>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={"Paste seluruh naskah di sini...\n\nSetiap kalimat (diakhiri titik, tanda seru, atau tanda tanya) akan dipecah menjadi item terpisah.\n\nContoh:\nTahukah kamu apa itu aurat? Aurat adalah bagian tubuh yang wajib ditutup. Allah berfirman dalam QS. An-Nur ayat 31 tentang menutup aurat."}
              rows={8}
              className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-violet-400 outline-none resize-none placeholder:text-slate-300 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-slate-400">
                {rawText.trim() ? `~${splitIntoSentences(rawText).length} kalimat terdeteksi` : "Belum ada teks"}
              </span>
              <div className="flex gap-2">
                {sentences.length > 0 && scenes.length === 0 && (
                  <button
                    onClick={handleAutoMerge}
                    className="flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    ⚡ Auto: 1 kalimat = 1 scene
                  </button>
                )}
                <button
                  onClick={handleSplitSentences}
                  disabled={!rawText.trim()}
                  className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Layers size={14} />
                  Pecah Jadi Kalimat
                </button>
              </div>
            </div>
            {/* Back to Camera toggle */}
            <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={backToCamera}
                onChange={e => setBackToCamera(e.target.checked)}
                className="w-4 h-4 accent-violet-600 rounded"
              />
              <span className="text-[11px] text-slate-600">🔒 Karakter membelakangi kamera <span className="text-slate-400">(opsional — keamanan ekstra)</span></span>
            </label>
          </div>

          {/* Settings (collapsible) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all"
            >
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Monitor size={14} className="text-violet-500" /> Pengaturan Output
              </span>
              {showSettings ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </button>
            {showSettings && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 animate-in slide-in-from-top-2 duration-200">
                {/* Aspect Ratio */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {SCENE_ASPECT_RATIOS.map(ar => (
                      <button
                        key={ar.id}
                        onClick={() => setAspectRatio(ar.id)}
                        className={`flex-1 py-2 rounded-xl border-2 text-center transition-all ${
                          aspectRatio === ar.id
                            ? "border-violet-400 bg-violet-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <p className="text-xs font-bold text-slate-700">{ar.label}</p>
                        <p className="text-[9px] text-slate-400">{ar.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform target */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Platform Animasi</label>
                  <select
                    value={platformId}
                    onChange={e => setPlatformId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                  >
                    {PLATFORM_TARGETS.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (max {p.maxDuration})</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Scene Input (character cards + sentence list + scene list) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-320px)] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
              🎬 Scene ({scenes.length})
            </h3>
            <SceneInput
              sentences={sentences}
              scenes={scenes}
              characters={characters}
              onSentencesChange={setSentences}
              onScenesChange={setScenes}
              onCharactersChange={setCharacters}
              onMergeSelected={handleMergeSelected}
            />
          </div>
        </div>

        {/* Right: Output Panel */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto sticky top-4">
            <PromptOutput scenes={scenes} />
          </div>
        </div>
      </div>
    </div>
  );
}
