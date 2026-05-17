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

/**
 * Scene Prompt Studio v3 — Workflow yang benar:
 * 
 * STEP 1: Paste narasi → "Pecah & Buat Scene" → otomatis 1 kalimat = 1 scene
 * STEP 2: User bisa merge 2+ scene berdekatan → jadi 1 scene (opsional)
 * STEP 3: User edit per-scene settings (camera, mood, karakter, dll)
 * STEP 4: Klik "Generate Prompt" → output gambar + animasi
 */
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

  // Track which step user is on for UI guidance
  const step = scenes.length > 0 ? (scenes[0].imagePrompt ? 3 : 2) : (sentences.length > 0 ? 1 : 0);

  // ─── STEP 1: Pecah narasi & langsung buat scene ───
  const handleSplitAndCreateScenes = () => {
    if (!rawText.trim()) {
      toast.error("Masukkan narasi terlebih dahulu");
      return;
    }

    const extracted = splitIntoSentences(rawText);
    if (extracted.length === 0) {
      toast.error("Tidak ditemukan kalimat yang bisa dipecah");
      return;
    }

    // Create sentences for reference
    const newSentences: SentenceItem[] = extracted.map((text, i) => ({
      id: `sent-${Date.now()}-${i}`,
      text,
      originalIndex: i,
      selected: false,
    }));
    setSentences(newSentences);

    // Auto-create 1 scene per sentence
    const newScenes: SceneItem[] = newSentences.map((s) => {
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
    toast.success(`✅ ${newScenes.length} scene berhasil dibuat dari ${extracted.length} kalimat`);
  };

  // ─── STEP 2: Merge selected scenes (AFTER scenes exist) ───
  const handleMergeSelectedScenes = (selectedIndices: number[]) => {
    if (selectedIndices.length < 2) {
      toast.error("Pilih minimal 2 scene untuk digabung");
      return;
    }

    // Sort indices
    const sorted = [...selectedIndices].sort((a, b) => a - b);

    // Check contiguous
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i - 1] + 1) {
        toast.error("Scene yang digabung harus berurutan (berdekatan)");
        return;
      }
    }

    const scenesToMerge = sorted.map(i => scenes[i]);
    const mergedNarration = scenesToMerge.map(s => s.narration).join(" ");
    const mergedSentenceIds = scenesToMerge.flatMap(s => s.sentenceIds);
    const mergedCharacterIds = [...new Set(scenesToMerge.flatMap(s => s.characterIds))];

    // Use first scene's presets as base
    const baseScene = scenesToMerge[0];
    const mergedScene: SceneItem = {
      id: `scene-merged-${Date.now()}`,
      narration: mergedNarration,
      sentenceIds: mergedSentenceIds,
      camera: baseScene.camera,
      mood: baseScene.mood,
      location: baseScene.location,
      timeOfDay: baseScene.timeOfDay,
      animationMotion: baseScene.animationMotion,
      imagePrompt: "",       // Clear — needs re-generate
      animationPrompt: "",   // Clear — needs re-generate
      characterIds: mergedCharacterIds,
      backToCamera: baseScene.backToCamera,
    };

    // Replace merged scenes with single merged scene
    const newScenes = [
      ...scenes.slice(0, sorted[0]),
      mergedScene,
      ...scenes.slice(sorted[sorted.length - 1] + 1),
    ];

    setScenes(newScenes);
    toast.success(`🔗 ${sorted.length} scene digabung → Scene ${sorted[0] + 1}`);
  };

  // ─── Reset — start over ───
  const handleReset = () => {
    setSentences([]);
    setScenes([]);
    toast.success("🔄 Reset berhasil — siap mulai ulang");
  };

  // ─── Toggle Age Selection ───
  const toggleAge = (ageId: string) => {
    setSelectedAges(prev => {
      if (prev.includes(ageId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== ageId);
      }
      return [...prev, ageId];
    });
  };

  // ─── STEP 3: Generate All Prompts ───
  const handleGenerate = () => {
    if (scenes.length === 0) {
      toast.error("Buat scene terlebih dahulu");
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
          <p className="text-slate-500 mt-1 text-sm">Generate prompt gambar & animasi — pecah narasi, atur scene, generate prompt</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {scenes.length > 0 && (
            <button
              onClick={handleReset}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all"
            >
              🔄 Reset
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={scenes.length === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 transition-all disabled:opacity-50"
          >
            <Sparkles size={16} />
            Generate Prompt ({scenes.length} scene)
          </button>
        </div>
      </div>

      {/* ─── Step Progress Bar ─── */}
      <div className="flex items-center gap-2 mb-6 px-1">
        {[
          { num: 1, label: "Pecah Narasi", active: step >= 1 },
          { num: 2, label: "Atur Scene", active: step >= 2 },
          { num: 3, label: "Generate Prompt", active: step >= 3 },
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border transition-all ${
              s.active ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-slate-50 border-slate-200 text-slate-400'
            }`}>
              <span className={`text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                s.active ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-400'
              }`}>{s.num}</span>
              <span className="text-[11px] font-bold">{s.label}</span>
            </div>
            {i < 2 && <span className="text-slate-300 text-xs">→</span>}
          </div>
        ))}
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
              placeholder={"Paste seluruh naskah di sini...\n\nSetiap kalimat (diakhiri titik, tanda seru, atau tanda tanya) akan dipecah menjadi 1 scene.\n\nContoh:\nTahukah kamu apa itu aurat? Aurat adalah bagian tubuh yang wajib ditutup. Allah berfirman dalam QS. An-Nur ayat 31 tentang menutup aurat."}
              rows={8}
              className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-violet-400 outline-none resize-none placeholder:text-slate-300 leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[10px] text-slate-400">
                {rawText.trim() ? `~${splitIntoSentences(rawText).length} kalimat terdeteksi` : "Belum ada teks"}
              </span>
              <button
                onClick={handleSplitAndCreateScenes}
                disabled={!rawText.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                <Layers size={14} />
                {scenes.length > 0 ? "Pecah Ulang" : "Pecah & Buat Scene"}
              </button>
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

          {/* Scene Input (character cards + scene list with merge) */}
          {scenes.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-320px)] overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                🎬 Scene ({scenes.length})
                <span className="text-[9px] font-normal text-slate-400 ml-1">— pilih 2+ scene berdekatan untuk digabung</span>
              </h3>
              <SceneInput
                scenes={scenes}
                characters={characters}
                onScenesChange={setScenes}
                onCharactersChange={setCharacters}
                onMergeScenes={handleMergeSelectedScenes}
              />
            </div>
          )}
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
