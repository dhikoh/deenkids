"use client";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { fetchEditorNodes } from "@/lib/api";
import {
  Clapperboard, Sparkles, Palette, Monitor, ChevronDown, ChevronUp, Layers, Baby,
  User, Mic, FolderOpen, Save, Trash, Plus, Brain, Copy, Check, Upload, Sliders, Volume2, HelpCircle
} from "lucide-react";
import {
  SceneItem, SentenceItem, CharacterCard, VisualStyle,
  VISUAL_STYLE_PRESETS, ART_STYLES, RENDERINGS, COLOR_MOODS,
  SCENE_ASPECT_RATIOS, PLATFORM_TARGETS, AGE_TARGETS, DEFAULT_AGE_TARGET,
  MainCharacterRole, MAIN_CHARACTER_ROLES,
  VoiceoverGender, VOICEOVER_GENDERS, ProjectDraft,
} from "./types";
import { 
  splitIntoSentences, generateAllPrompts, detectSceneCategory, autoDetectPresets, 
  generateImagePrompt, generateAnimationPrompt, generateMasterDirectorPrompt,
  generateTitleIdeaPrompt, generateImportableScriptPrompt
} from "./prompt-engine";
import SceneInput from "./SceneInput";
import PromptOutput from "./PromptOutput";

/**
 * Scene Prompt Studio v3 — Workflow:
 *
 * ① Paste narasi → "Pecah & Buat Scene" → 1 kalimat = 1 scene otomatis
 * ② Edit per-scene settings (camera, mood, karakter, dll) — panel KIRI
 * ③ "Generate Prompt" → output prompt gambar + animasi — panel KANAN
 * ④ Di OUTPUT: merge 2+ scene berurutan → otomatis regenerate
 */
export default function ScenePromptStudioPage() {
  // ─── State ───
  const [activeTab, setActiveTab] = useState<'studio' | 'storyboard' | 'titles'>('studio');
  const [rawText, setRawText] = useState("");
  const [sentences, setSentences] = useState<SentenceItem[]>([]);
  const [scenes, setScenes] = useState<SceneItem[]>([]);
  const [characters, setCharacters] = useState<CharacterCard[]>([]);

  // Timeline & Audio Duration settings
  const [targetAudioMinutes, setTargetAudioMinutes] = useState(0);
  const [targetAudioSeconds, setTargetAudioSeconds] = useState(30);
  const [maxClipDuration, setMaxClipDuration] = useState(4.0);
  const [jsonImportText, setJsonImportText] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // States for AI Title & Idea Generator (2-Step Wizard)
  const [ideaTopic, setIdeaTopic] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("kisah");
  const [ideaSubCategoryId, setIdeaSubCategoryId] = useState("");
  const [kisahNodes, setKisahNodes] = useState<any[]>([]);
  const [ideaPov, setIdeaPov] = useState<"ORTU" | "ANAK">("ORTU");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [copiedPrompt1, setCopiedPrompt1] = useState(false);
  const [copiedPrompt2, setCopiedPrompt2] = useState(false);

  // Visual style
  const [visualPresetId, setVisualPresetId] = useState("adably-kids");
  const [showCustomStyle, setShowCustomStyle] = useState(false);
  const [customStyle, setCustomStyle] = useState<VisualStyle>({
    artStyle: "childrens-book",
    rendering: "soft-dreamy",
    colorMood: "warm-pastel",
  });
  const [isAutoVisualAll, setIsAutoVisualAll] = useState(false);

  // Settings
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [platformId, setPlatformId] = useState("runway");
  const [showSettings, setShowSettings] = useState(false);
  const [backToCamera, setBackToCamera] = useState(false);
  const [selectedAges, setSelectedAges] = useState<string[]>([DEFAULT_AGE_TARGET]);

  // Main character & voiceover (optional)
  const [mainCharacterRole, setMainCharacterRole] = useState<MainCharacterRole>('');
  const [voiceoverGender, setVoiceoverGender] = useState<VoiceoverGender>('');

  // Drafts & Local Storage Persistence State
  const [drafts, setDrafts] = useState<ProjectDraft[]>([]);
  const [newDraftName, setNewDraftName] = useState("");
  const [showDraftsPanel, setShowDraftsPanel] = useState(false);
  const [isLoadingActiveSession, setIsLoadingActiveSession] = useState(true);

  const isCustom = visualPresetId === "custom";

  // ─── Auto-Save Active Session ───
  useEffect(() => {
    if (isLoadingActiveSession) return;

    const activeSession = {
      rawText,
      sentences,
      scenes,
      characters,
      visualPresetId,
      isAutoVisualAll,
      aspectRatio,
      platformId,
      selectedAges,
      mainCharacterRole,
      voiceoverGender,
      targetAudioMinutes,
      targetAudioSeconds,
      maxClipDuration,
    };

    localStorage.setItem("adably_prompt_studio_active_session", JSON.stringify(activeSession));
  }, [
    rawText, sentences, scenes, characters, visualPresetId,
    isAutoVisualAll, aspectRatio, platformId, selectedAges,
    mainCharacterRole, voiceoverGender, targetAudioMinutes,
    targetAudioSeconds, maxClipDuration, isLoadingActiveSession
  ]);

  // Load Kisah nodes dinamis untuk Tab 3
  useEffect(() => {
    const token = Cookies.get("_at");
    if (token) {
      fetchEditorNodes(token, "KISAH").then(r => {
        const flat = (nodes: any[], prefix = ""): any[] => {
          let result: any[] = [];
          for (const n of nodes) {
            const label = prefix ? `${prefix} > ${n.title}` : n.title;
            result.push({ id: n.id, label, title: n.title });
            if (n.children?.length) result = result.concat(flat(n.children, label));
          }
          return result;
        };
        const flatNodes = flat(r.data || r || []);
        setKisahNodes(flatNodes);
        if (flatNodes.length > 0 && !ideaSubCategoryId) {
          setIdeaSubCategoryId(flatNodes[0].id);
        }
      }).catch(() => {});
    }
  }, []);

  // ─── Load Active Session & Drafts List on Mount ───
  useEffect(() => {
    // 1. Load drafts list
    const savedDrafts = localStorage.getItem("adably_prompt_studio_drafts");
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        console.error("Gagal memuat drafts", e);
      }
    }

    // 2. Load active session
    const savedActive = localStorage.getItem("adably_prompt_studio_active_session");
    if (savedActive) {
      try {
        const parsed = JSON.parse(savedActive);
        if (parsed.rawText !== undefined) setRawText(parsed.rawText);
        if (parsed.sentences !== undefined) setSentences(parsed.sentences);
        if (parsed.scenes !== undefined) setScenes(parsed.scenes);
        if (parsed.characters !== undefined) setCharacters(parsed.characters);
        if (parsed.visualPresetId !== undefined) setVisualPresetId(parsed.visualPresetId);
        if (parsed.isAutoVisualAll !== undefined) setIsAutoVisualAll(parsed.isAutoVisualAll);
        if (parsed.aspectRatio !== undefined) setAspectRatio(parsed.aspectRatio);
        if (parsed.platformId !== undefined) setPlatformId(parsed.platformId);
        if (parsed.selectedAges !== undefined) setSelectedAges(parsed.selectedAges);
        if (parsed.mainCharacterRole !== undefined) setMainCharacterRole(parsed.mainCharacterRole);
        if (parsed.voiceoverGender !== undefined) setVoiceoverGender(parsed.voiceoverGender);
        if (parsed.targetAudioMinutes !== undefined) setTargetAudioMinutes(parsed.targetAudioMinutes);
        if (parsed.targetAudioSeconds !== undefined) setTargetAudioSeconds(parsed.targetAudioSeconds);
        if (parsed.maxClipDuration !== undefined) setMaxClipDuration(parsed.maxClipDuration);
      } catch (e) {
        console.error("Gagal memuat sesi aktif", e);
      }
    }
    setIsLoadingActiveSession(false);
  }, []);

  // ── Simpan Proyek Baru ──
  const handleSaveDraft = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDraftName.trim()) {
      toast.error("Tulis nama proyek terlebih dahulu");
      return;
    }

    const totalSec = targetAudioMinutes * 60 + targetAudioSeconds;
    const newDraft: ProjectDraft = {
      id: `draft-${Date.now()}`,
      name: newDraftName.trim(),
      createdAt: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      rawText,
      sentences,
      scenes,
      characters,
      visualPresetId,
      isAutoVisualAll,
      aspectRatio,
      platformId,
      selectedAges,
      mainCharacterRole,
      voiceoverGender,
      targetAudioDuration: totalSec,
      targetAudioDurationFormatted: `${String(targetAudioMinutes).padStart(2, '0')}:${String(targetAudioSeconds).padStart(2, '0')}`,
      maxClipDuration,
    };

    const updated = [newDraft, ...drafts];
    setDrafts(updated);
    localStorage.setItem("adably_prompt_studio_drafts", JSON.stringify(updated));
    setNewDraftName("");
    toast.success(`💾 Proyek "${newDraft.name}" berhasil disimpan!`);
  };

  // ── Buka Proyek Tersimpan ──
  const handleLoadDraft = (draft: ProjectDraft) => {
    setRawText(draft.rawText);
    setSentences(draft.sentences);
    setScenes(draft.scenes);
    setCharacters(draft.characters);
    setVisualPresetId(draft.visualPresetId);
    setIsAutoVisualAll(draft.isAutoVisualAll);
    setAspectRatio(draft.aspectRatio);
    setPlatformId(draft.platformId);
    setSelectedAges(draft.selectedAges);
    setMainCharacterRole(draft.mainCharacterRole);
    setVoiceoverGender(draft.voiceoverGender);
    if (draft.maxClipDuration !== undefined) setMaxClipDuration(draft.maxClipDuration);
    
    // Parse duration back to minutes & seconds
    const totalSec = draft.targetAudioDuration ?? 30;
    setTargetAudioMinutes(Math.floor(totalSec / 60));
    setTargetAudioSeconds(totalSec % 60);

    toast.success(`📁 Membuka proyek "${draft.name}"`);
  };

  // ── Hapus Proyek Tersimpan ──
  const handleDeleteDraft = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus proyek "${name}"?`)) {
      const updated = drafts.filter(d => d.id !== id);
      setDrafts(updated);
      localStorage.setItem("adably_prompt_studio_drafts", JSON.stringify(updated));
      toast.success(`🗑️ Proyek "${name}" berhasil dihapus`);
    }
  };

  // ─── Timeline Auto-Distribute ───
  const handleAutoDistribute = () => {
    const totalTarget = targetAudioMinutes * 60 + targetAudioSeconds;
    if (totalTarget <= 0 || scenes.length === 0) {
      toast.error("Target durasi atau scene kosong");
      return;
    }

    const totalWords = scenes.reduce((sum, s) => {
      const words = s.narration.trim().split(/\s+/).filter(Boolean).length;
      return sum + words;
    }, 0);

    if (totalWords === 0) {
      toast.error("Naskah scene kosong");
      return;
    }

    const updated = scenes.map(s => {
      const words = s.narration.trim().split(/\s+/).filter(Boolean).length;
      const calculatedDuration = Math.round((words / totalWords) * totalTarget * 10) / 10;
      return {
        ...s,
        duration: Math.max(calculatedDuration, 1.0),
      };
    });

    // Otomatis regenerate prompt visual setelah durasi berubah agar data konsisten
    const regenerated = generateAllPrompts(
      updated,
      rawText,
      visualPresetId,
      customStyle,
      characters,
      aspectRatio,
      platformId,
      selectedAges,
      mainCharacterRole,
      voiceoverGender
    );

    setScenes(regenerated);
    toast.success("⚖️ Durasi didistribusikan secara proporsional!");
  };

  // ─── Import Storyboard JSON ───
  const handleImportStoryboard = () => {
    if (!jsonImportText.trim()) {
      toast.error("Tempelkan JSON output AI terlebih dahulu");
      return;
    }

    try {
      let cleanedJson = jsonImportText.trim();
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.substring(7);
      }
      if (cleanedJson.endsWith("```")) {
        cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
      }
      cleanedJson = cleanedJson.trim();

      const parsed = JSON.parse(cleanedJson);
      if (!Array.isArray(parsed)) {
        toast.error("Format JSON harus berupa Array dari adegan");
        return;
      }

      const importedScenes: SceneItem[] = parsed.map((item: any, idx: number) => {
        const narration = item.narration || `Adegan ${idx + 1}`;
        const category = detectSceneCategory(narration);
        const presets = autoDetectPresets(narration, category);

        return {
          id: `scene-${Date.now()}-${idx}`,
          narration,
          sentenceIds: [`sent-import-${Date.now()}-${idx}`],
          camera: item.camera || presets.camera,
          mood: item.mood || presets.mood,
          location: item.location || presets.location,
          timeOfDay: item.timeOfDay || presets.timeOfDay,
          animationMotion: item.animationMotion || "ambient",
          duration: typeof item.duration === "number" ? item.duration : 4.0,
          imagePrompt: "",
          animationPrompt: "",
          characterIds: [],
          backToCamera,
          isAutoVisual: item.isAutoVisual !== undefined ? item.isAutoVisual : true,
        };
      });

      // Regenerate prompts for all newly imported scenes
      const fullText = importedScenes.map(s => s.narration).join(" ");
      const readyScenes = generateAllPrompts(
        importedScenes,
        fullText,
        visualPresetId,
        customStyle,
        characters,
        aspectRatio,
        platformId,
        selectedAges,
        mainCharacterRole,
        voiceoverGender
      );

      setScenes(readyScenes);
      
      const newSentences: SentenceItem[] = readyScenes.map((s, idx) => ({
        id: s.sentenceIds[0],
        text: s.narration,
        originalIndex: idx,
        selected: false,
      }));
      setSentences(newSentences);
      setRawText(fullText);

      setActiveTab("studio");
      setJsonImportText("");
      toast.success("🚀 Storyboard berhasil di-import ke Studio!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal membaca JSON. Pastikan kode JSON bersih dan valid.");
    }
  };

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
        isAutoVisual: isAutoVisualAll,
        duration: 4.0,
      };
    });

    setScenes(newScenes);
    toast.success(`✅ ${newScenes.length} scene berhasil dibuat dari ${extracted.length} kalimat`);
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

  // ─── STEP 2: Generate All Prompts ───
  const handleGenerate = () => {
    if (scenes.length === 0) {
      toast.error("Buat scene terlebih dahulu");
      return;
    }

    const updated = generateAllPrompts(
      scenes, rawText, visualPresetId,
      isCustom ? customStyle : undefined,
      characters, aspectRatio, platformId, selectedAges,
      mainCharacterRole, voiceoverGender,
    );

    setScenes(updated);
    toast.success(`🎬 ${updated.length} prompt berhasil di-generate!`);
  };

  // ─── STEP 3 (OUTPUT): Merge scenes & auto-regenerate ───
  const handleMergeInOutput = (selectedIndices: number[]) => {
    if (selectedIndices.length < 2) {
      toast.error("Pilih minimal 2 scene untuk digabung");
      return;
    }

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
      imagePrompt: "",
      animationPrompt: "",
      characterIds: mergedCharacterIds,
      backToCamera: baseScene.backToCamera,
      isAutoVisual: baseScene.isAutoVisual,
      duration: scenesToMerge.reduce((sum, s) => sum + (s.duration ?? 4.0), 0),
    };

    // Replace merged scenes with single merged scene
    const newScenes = [
      ...scenes.slice(0, sorted[0]),
      mergedScene,
      ...scenes.slice(sorted[sorted.length - 1] + 1),
    ];

    // Auto-regenerate ALL prompts (indices shifted, need fresh continuity)
    const regenerated = generateAllPrompts(
      newScenes, rawText, visualPresetId,
      isCustom ? customStyle : undefined,
      characters, aspectRatio, platformId, selectedAges,
      mainCharacterRole, voiceoverGender,
    );

    setScenes(regenerated);
    toast.success(`🔗 ${sorted.length} scene digabung → prompt otomatis di-regenerate`);
  };

  // ─── STEP 4 (DYNAMIC OVERRIDES): Update scene visual preset and regenerate prompts instantly ───
  const handleUpdateSceneVisual = (sceneIndex: number, patch: Partial<SceneItem>) => {
    setScenes(prev => {
      const next = prev.map((scene, idx) => {
        if (idx !== sceneIndex) return scene;

        const updated = { ...scene, ...patch };

        // Auto-regenerate prompts just for this specific scene!
        updated.imagePrompt = generateImagePrompt(
          updated, rawText, visualPresetId,
          isCustom ? customStyle : undefined,
          characters, aspectRatio, selectedAges, idx, prev.length,
          mainCharacterRole, voiceoverGender
        );

        updated.animationPrompt = generateAnimationPrompt(
          updated, rawText, visualPresetId,
          isCustom ? customStyle : undefined,
          characters, aspectRatio, platformId, selectedAges, idx, prev.length,
          mainCharacterRole, voiceoverGender
        );

        return updated;
      });
      return next;
    });
  };

  const handleToggleAutoVisualAll = (checked: boolean) => {
    setIsAutoVisualAll(checked);
    if (scenes.length === 0) return;

    const updated = scenes.map((scene, idx) => {
      const updatedScene = { ...scene, isAutoVisual: checked };

      updatedScene.imagePrompt = generateImagePrompt(
        updatedScene, rawText, visualPresetId,
        isCustom ? customStyle : undefined,
        characters, aspectRatio, selectedAges, idx, scenes.length,
        mainCharacterRole, voiceoverGender
      );

      updatedScene.animationPrompt = generateAnimationPrompt(
        updatedScene, rawText, visualPresetId,
        isCustom ? customStyle : undefined,
        characters, aspectRatio, platformId, selectedAges, idx, scenes.length,
        mainCharacterRole, voiceoverGender
      );

      return updatedScene;
    });

    setScenes(updated);
    toast.success(checked ? "✨ Semua scene diatur otomatis oleh AI!" : "🔓 Mode manual diaktifkan kembali.");
  };

  // ─── Reset ───
  const handleReset = () => {
    setSentences([]);
    setScenes([]);
    setIsAutoVisualAll(false);
    toast.success("🔄 Reset berhasil");
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
          <p className="text-slate-500 mt-1 text-sm">Pecah narasi → atur scene → generate prompt → gabung di output</p>
        </div>
        <div className="flex items-center gap-2">
          {scenes.length > 0 && (
            <label className="flex items-center gap-1.5 px-3 py-2 bg-violet-50/50 border border-violet-200 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAutoVisualAll}
                onChange={(e) => handleToggleAutoVisualAll(e.target.checked)}
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-400 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[11px] font-extrabold text-violet-700 flex items-center gap-0.5">
                <Sparkles size={10} /> Auto AI Semua Scene
              </span>
            </label>
          )}
          <button
            onClick={() => setShowDraftsPanel(!showDraftsPanel)}
            className={`flex items-center gap-1 px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
              showDraftsPanel
                ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            <FolderOpen size={12} /> Manajer Proyek {drafts.length > 0 && `(${drafts.length})`}
          </button>
          {scenes.length > 0 && (
            <button onClick={handleReset} className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl text-xs font-bold transition-all">
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

      {/* ─── Drafts Manager Panel (Collapsible Dropdown) ─── */}
      {showDraftsPanel && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-md mb-6 animate-in slide-in-from-top-3 duration-250">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                <FolderOpen size={16} className="text-violet-600" /> Manajer Proyek (Drafts)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Simpan dan muat kembali progres penyusunan prompt adegan Anda.</p>
            </div>

            {/* Form simpan draft baru */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveDraft();
              }}
              className="flex items-center gap-2 max-w-sm w-full"
            >
              <input
                type="text"
                value={newDraftName}
                onChange={(e) => setNewDraftName(e.target.value)}
                placeholder="Nama proyek baru (misal: Doa Al-Mujib)"
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:border-violet-400 outline-none font-bold placeholder:font-normal"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0"
              >
                <Save size={12} /> Simpan Draft
              </button>
            </form>
          </div>

          {/* List of drafts */}
          {drafts.length === 0 ? (
            <div className="text-center py-6 text-slate-300">
              <FolderOpen size={24} className="mx-auto mb-1.5 opacity-40" />
              <p className="text-[11px] font-bold">Belum ada proyek tersimpan</p>
              <p className="text-[9px] mt-0.5">Ketik nama proyek di atas untuk mengunci progress draft aktif Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
              {drafts.map((draft) => (
                <div key={draft.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start justify-between gap-3 group">
                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => handleLoadDraft(draft)}>
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-violet-600 transition-colors">
                      📁 {draft.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[9px] text-slate-400 font-medium">
                      <span>🎬 {draft.scenes.length} scene</span>
                      <span>•</span>
                      <span>{draft.createdAt}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleLoadDraft(draft)}
                      className="px-2.5 py-1 bg-white hover:bg-violet-50 border border-slate-200 text-violet-600 text-[9px] font-bold rounded-lg transition-all"
                      title="Buka Proyek"
                    >
                      Buka
                    </button>
                    <button
                      onClick={() => handleDeleteDraft(draft.id, draft.name)}
                      className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      title="Hapus Proyek"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Navigasi Tab Workspace ─── */}
      <div className="flex border-b border-slate-200 mb-6 bg-slate-50/50 p-1 rounded-2xl border">
        <button
          onClick={() => setActiveTab('studio')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'studio'
              ? "bg-white text-violet-600 shadow-sm border border-slate-100 font-extrabold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          🎬 Tab 1: Prompt Studio (Editor)
        </button>
        <button
          onClick={() => setActiveTab('storyboard')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'storyboard'
              ? "bg-white text-violet-600 shadow-sm border border-slate-100 font-extrabold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          🧠 Tab 2: Storyboard Planner
        </button>
        <button
          onClick={() => setActiveTab('titles')}
          className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'titles'
              ? "bg-white text-violet-600 shadow-sm border border-slate-100 font-extrabold"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          💡 Tab 3: Ide & Judul AI
        </button>
      </div>

      {/* ─── Timeline Status Bar (Dinamis Dua Arah) ─── */}
      {activeTab === 'studio' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 rounded-xl border border-violet-100 text-violet-600 flex-shrink-0">
              <Volume2 size={16} />
            </div>
            {(() => {
              const targetSec = targetAudioMinutes * 60 + targetAudioSeconds;
              const currentSec = scenes.reduce((sum, s) => sum + (s.duration ?? 4.0), 0);
              const diff = targetSec - currentSec;
              const absDiff = Math.abs(diff);

              let statusText = "Sinkron Sempurna";
              let statusColor = "bg-emerald-500 text-white";
              let statusDesc = "Visual adegan tepat sinkron dengan audio narasi.";

              if (diff > 0.05) {
                statusText = `${absDiff.toFixed(1)}s Kurang`;
                statusColor = "bg-amber-500 text-white";
                statusDesc = "⚠️ Durasi scene kurang. Klik Auto-Distribute atau sesuaikan durasi adegan.";
              } else if (diff < -0.05) {
                statusText = `${absDiff.toFixed(1)}s Berlebih`;
                statusColor = "bg-rose-500 text-white";
                statusDesc = "⚠️ Durasi scene melebihi audio narasi. Kurangi durasi scene Anda.";
              }

              return (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Timeline Audio Sync</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${statusColor}`}>
                      {statusText}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    Target: <strong className="text-slate-600">{targetAudioMinutes}:{String(targetAudioSeconds).padStart(2, '0')}</strong> ({targetSec}s) | Terisi: <strong className="text-slate-600">{currentSec.toFixed(1)}s</strong> | {statusDesc}
                  </p>
                </div>
              );
            })()}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-2.5 py-1.5 bg-slate-50">
              <span className="text-[9px] font-bold text-slate-400">Target MP3:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={targetAudioMinutes}
                onChange={e => setTargetAudioMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-8 text-center text-xs bg-transparent font-bold text-slate-700 outline-none"
                placeholder="Min"
              />
              <span className="text-slate-400 text-xs">:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={targetAudioSeconds}
                onChange={e => setTargetAudioSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                className="w-8 text-center text-xs bg-transparent font-bold text-slate-700 outline-none"
                placeholder="Det"
              />
            </div>

            <button
              onClick={handleAutoDistribute}
              disabled={scenes.length === 0}
              className="flex items-center gap-1 px-4 py-2 border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              title="Bagi sisa detik timeline secara proporsional ke semua scene"
            >
              <Sliders size={12} />
              Auto-Distribute
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 1: STUDIO (EDITOR UTAMA) ─── */}
      {activeTab === 'studio' && (
        <>
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
                <button
                  onClick={() => { setVisualPresetId("custom"); setShowCustomStyle(true); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    isCustom ? "border-violet-400 shadow-sm ring-1 ring-violet-200" : "border-dashed border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-1.5 text-lg">🎛️</div>
                  <p className="text-[11px] font-bold text-slate-700">Custom</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Pilih sendiri</p>
                </button>
              </div>
              {showCustomStyle && isCustom && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Art Style</label>
                    <select value={customStyle.artStyle} onChange={e => setCustomStyle({ ...customStyle, artStyle: e.target.value })} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none">
                      {ART_STYLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Rendering</label>
                    <select value={customStyle.rendering} onChange={e => setCustomStyle({ ...customStyle, rendering: e.target.value })} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none">
                      {RENDERINGS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Color Mood</label>
                    <select value={customStyle.colorMood} onChange={e => setCustomStyle({ ...customStyle, colorMood: e.target.value })} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none">
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
                      selectedAges.includes(age.id) ? "border-violet-400 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{age.label}</span>
                      {selectedAges.includes(age.id) && <span className="text-[9px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded">✓</span>}
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
              {/* Narration input */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">📝 Narasi / Naskah</h3>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={"Paste seluruh naskah di sini...\n\nSetiap kalimat (diakhiri titik, tanda seru, atau tanda tanya) akan menjadi 1 scene.\n\nContoh:\nTahukah kamu apa itu aurat? Aurat adalah bagian tubuh yang wajib ditutup. Allah berfirman dalam QS. An-Nur ayat 31 tentang menutup aurat."}
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
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input type="checkbox" checked={backToCamera} onChange={e => setBackToCamera(e.target.checked)} className="w-4 h-4 accent-violet-600 rounded" />
                  <span className="text-[11px] text-slate-600">🔒 Karakter membelakangi kamera <span className="text-slate-400">(opsional)</span></span>
                </label>
              </div>

              {/* Settings */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-all">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Monitor size={14} className="text-violet-500" /> Pengaturan Output
                  </span>
                  {showSettings ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>
                {showSettings && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3 animate-in slide-in-from-top-2 duration-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Aspect Ratio</label>
                      <div className="flex gap-2">
                        {SCENE_ASPECT_RATIOS.map(ar => (
                          <button key={ar.id} onClick={() => setAspectRatio(ar.id)} className={`flex-1 py-2 rounded-xl border-2 text-center transition-all ${aspectRatio === ar.id ? "border-violet-400 bg-violet-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                            <p className="text-xs font-bold text-slate-700">{ar.label}</p>
                            <p className="text-[9px] text-slate-400">{ar.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1.5 block">Platform Animasi</label>
                      <select value={platformId} onChange={e => setPlatformId(e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none">
                        {PLATFORM_TARGETS.map(p => (<option key={p.id} value={p.id}>{p.name} (max {p.maxDuration})</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block flex justify-between">
                        <span>⏱️ Batas Maksimal Klip Video</span>
                        <span className="font-extrabold text-violet-600">{maxClipDuration.toFixed(0)} detik</span>
                      </label>
                      <input
                        type="range"
                        min="4"
                        max="20"
                        step="1"
                        value={maxClipDuration}
                        onChange={e => setMaxClipDuration(parseInt(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer h-1 bg-slate-200 rounded-lg appearance-none mt-1"
                      />
                      <p className="text-[8px] text-slate-400 mt-1">Mengatur durasi maksimal video generator (Runway/Luma) untuk memecah adegan panjang secara otomatis.</p>
                    </div>
                    {/* Main Character Role */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1.5 block flex items-center gap-1">
                        <User size={10} className="text-violet-500" /> Karakter Utama <span className="text-slate-400 font-normal">(opsional)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {MAIN_CHARACTER_ROLES.map(role => (
                          <button
                            key={role.id}
                            onClick={() => setMainCharacterRole(role.id)}
                            className={`px-3 py-2 rounded-xl border-2 text-center transition-all text-[11px] font-bold ${
                              mainCharacterRole === role.id
                                ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {role.label}
                          </button>
                        ))}
                      </div>
                      {mainCharacterRole && (
                        <p className="text-[9px] text-violet-500 mt-1">
                          {MAIN_CHARACTER_ROLES.find(r => r.id === mainCharacterRole)?.desc}
                        </p>
                      )}
                    </div>
                    {/* Voiceover Gender */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 mb-1.5 block flex items-center gap-1">
                        <Mic size={10} className="text-violet-500" /> Pengisi Suara <span className="text-slate-400 font-normal">(opsional)</span>
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {VOICEOVER_GENDERS.map(vo => (
                          <button
                            key={vo.id}
                            onClick={() => setVoiceoverGender(vo.id)}
                            className={`px-3 py-2 rounded-xl border-2 text-center transition-all text-[11px] font-bold ${
                              voiceoverGender === vo.id
                                ? "border-violet-400 bg-violet-50 text-violet-700 shadow-sm"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {vo.label}
                          </button>
                        ))}
                      </div>
                      {voiceoverGender && (
                        <p className="text-[9px] text-violet-500 mt-1">
                          {VOICEOVER_GENDERS.find(v => v.id === voiceoverGender)?.desc}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Scene Input — pure editor, NO merge */}
              {scenes.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-320px)] overflow-y-auto">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
                    🎬 Scene ({scenes.length})
                  </h3>
                  <SceneInput
                    scenes={scenes}
                    characters={characters}
                    onScenesChange={setScenes}
                    onCharactersChange={setCharacters}
                  />
                </div>
              )}
            </div>

            {/* Right: Output Panel — with merge capability */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto sticky top-4">
                <PromptOutput
                  scenes={scenes}
                  maxClipDuration={maxClipDuration}
                  onMergeScenes={handleMergeInOutput}
                  onUpdateSceneVisual={handleUpdateSceneVisual}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB 2: AI STORYBOARD PLANNER & IMPORTER ─── */}
      {activeTab === 'storyboard' && (() => {
        const masterPrompt = generateMasterDirectorPrompt(
          rawText || "Naskah video cerita animasi Anda...",
          targetAudioMinutes * 60 + targetAudioSeconds,
          selectedAges
        );

        const handleCopyMasterPrompt = () => {
          navigator.clipboard.writeText(masterPrompt).then(() => {
            setCopiedPrompt(true);
            toast.success("Master Director Prompt disalin!");
            setTimeout(() => setCopiedPrompt(false), 2500);
          }).catch(() => toast.error("Gagal menyalin"));
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Kolom Kiri: AI Planner Guide & Prompt Builder */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-violet-750">
                  <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
                    <Brain className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Langkah 1: Perencanaan Cerita & Prompt</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Copy petunjuk Master Director Prompt di bawah ini lalu kirimkan ke AI eksternal Anda (misal ChatGPT, Claude, atau Gemini). Prompt ini memandu AI untuk menyusun storyboard berdurasi persis sesuai dengan audio MP3 Anda dengan format JSON terstruktur yang siap pakai.
                </p>

                {/* Box Teks Prompt Sutradara */}
                <div className="relative bg-slate-900 border border-slate-950 rounded-2xl p-4 overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Master Director Prompt</span>
                    <button
                      onClick={handleCopyMasterPrompt}
                      className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white rounded-xl text-[10px] font-black hover:bg-violet-550 transition-all shadow-md shadow-violet-900/40"
                    >
                      {copiedPrompt ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                      {copiedPrompt ? "Tersalin!" : "Salin Prompt"}
                    </button>
                  </div>
                  <div className="max-h-[260px] overflow-y-auto text-[10px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words pr-2">
                    {masterPrompt}
                  </div>
                </div>

                {/* Alert Tips */}
                <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex gap-2">
                  <span className="text-sm">💡</span>
                  <p className="text-[10px] text-blue-700 leading-relaxed font-bold">
                    Tips Pacing: Jika Anda memiliki naskah audio suara, pastikan durasi total audio disinkronkan terlebih dahulu di bar atas agar AI membagi porsi durasi adegan secara presisi.
                  </p>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: JSON Importer & Validator */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-750">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <Upload className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Langkah 2: Tempel Hasil AI & Impor</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Tempelkan salinan respons JSON dari AI di kolom bawah ini. Sistem kami akan secara otomatis memvalidasi, membagi adegan, dan mengisi editor utama dengan visual serta durasi yang tepat.
                </p>

                <textarea
                  value={jsonImportText}
                  onChange={e => setJsonImportText(e.target.value)}
                  placeholder={'Tempel output JSON dari AI di sini...\n\nContoh format:\n[\n  { "narration": "Ahmad berjalan...", "duration": 6.5, "camera": "medium-shot" },\n  ...\n]'}
                  rows={13}
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-emerald-400 outline-none resize-none placeholder:text-slate-300 leading-relaxed shadow-inner"
                />

                <button
                  onClick={handleImportStoryboard}
                  disabled={!jsonImportText.trim()}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-100 transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                  Validasi & Impor Storyboard ke Studio
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── TAB 3: IDE & JUDUL AI (PRA-PRODUKSI 2-LANGKAH) ─── */}
      {activeTab === 'titles' && (() => {
        // Cari nama sub-kategori Kisah dinamis dari ID terpilih
        const selectedNode = kisahNodes.find(n => n.id === ideaSubCategoryId);
        const subCategoryName = selectedNode ? selectedNode.title : "";

        // Generator Prompt 1
        const prompt1Text = generateTitleIdeaPrompt(ideaTopic, ideaCategory, subCategoryName, selectedAges, ideaPov);
        
        // Generator Prompt 2 (jika judul telah terpilih)
        const prompt2Text = selectedTitle.trim() 
          ? generateImportableScriptPrompt(selectedTitle, ideaCategory, subCategoryName, selectedAges, ideaPov)
          : "";

        const handleCopyPrompt1 = () => {
          navigator.clipboard.writeText(prompt1Text).then(() => {
            setCopiedPrompt1(true);
            toast.success("Prompt Langkah 1 berhasil disalin!");
            setTimeout(() => setCopiedPrompt1(false), 2500);
          }).catch(() => toast.error("Gagal menyalin"));
        };

        const handleCopyPrompt2 = () => {
          if (!selectedTitle.trim()) {
            toast.error("Tulis/pilih judul terlebih dahulu di kolom Langkah 2!");
            return;
          }
          navigator.clipboard.writeText(prompt2Text).then(() => {
            setCopiedPrompt2(true);
            toast.success("Prompt Langkah 2 berhasil disalin!");
            setTimeout(() => setCopiedPrompt2(false), 2500);
          }).catch(() => toast.error("Gagal menyalin"));
        };

        return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
            {/* Kiri: Pengaturan Kategori & Langkah 1 */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-violet-700">
                  <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Langkah 1: Tentukan Preferensi & Cari Judul</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Isi parameter dasar di bawah ini untuk menghasilkan **Prompt Langkah 1**. Salin prompt ini dan kirimkan ke AI eksternal (ChatGPT/Gemini) untuk mendapatkan 10 rekomendasi judul yang menarik.
                </p>

                {/* Form Inputs */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                  {/* Tipe Konten */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipe / Kategori Konten</label>
                    <select
                      value={ideaCategory}
                      onChange={e => {
                        setIdeaCategory(e.target.value);
                        setSelectedTitle(""); // reset judul
                      }}
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                    >
                      <option value="kisah">📖 Kisah (Cerita & Narasi Islami)</option>
                      <option value="qna">❓ Tanya Jawab (Format Q&A)</option>
                      <option value="artikel">📄 Artikel (Tulisan Informatif)</option>
                      <option value="pembelajaran">🎓 Pembelajaran (Materi Edukasi)</option>
                    </select>
                  </div>

                  {/* Sub-Kategori Kisah (Conditional DYNAMIC Dropdown dari database Adably) */}
                  {ideaCategory === 'kisah' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Sub-Kategori Kisah (Dinamis dari Database)</label>
                      <select
                        value={ideaSubCategoryId}
                        onChange={e => setIdeaSubCategoryId(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
                      >
                        {kisahNodes.length > 0 ? (
                          kisahNodes.map(n => (
                            <option key={n.id} value={n.id}>{n.label}</option>
                          ))
                        ) : (
                          <option value="">— Memuat Sub-Kategori... —</option>
                        )}
                      </select>
                    </div>
                  )}

                  {/* POV selector kondisional untuk Artikel */}
                  {ideaCategory === 'artikel' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="text-[10px] font-bold text-slate-500 mb-1 block">Sudut Pandang (POV)</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setIdeaPov("ORTU")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            ideaPov === "ORTU"
                              ? "bg-violet-100 border-violet-300 text-violet-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          👨‍👩‍👧 Orang Tua
                        </button>
                        <button
                          type="button"
                          onClick={() => setIdeaPov("ANAK")}
                          className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                            ideaPov === "ANAK"
                              ? "bg-violet-100 border-violet-300 text-violet-700 shadow-sm"
                              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          👦 Anak
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Topik Dasar */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Fokus Topik / Kata Kunci <span className="text-slate-400 font-normal">(opsional)</span></label>
                    <input
                      type="text"
                      value={ideaTopic}
                      onChange={e => setIdeaTopic(e.target.value)}
                      placeholder="Contoh: bersyukur, adab makan, menyayangi kucing..."
                      className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:border-violet-400 outline-none"
                    />
                  </div>

                  {/* Target Usia Info */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>Target Usia Aktif (Tab 1):</span>
                    <strong className="text-violet-600 font-bold">
                      {selectedAges.length > 0 ? selectedAges.join(", ") : "Umum"}
                    </strong>
                  </div>
                </div>

                {/* Box Teks Prompt 1 */}
                <div className="relative bg-slate-900 border border-slate-950 rounded-2xl p-4 overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">Prompt Langkah 1 (Cari Judul)</span>
                    <button
                      onClick={handleCopyPrompt1}
                      className="flex items-center gap-1 px-3 py-1 bg-violet-600 text-white rounded-xl text-[10px] font-black hover:bg-violet-550 transition-all shadow-md shadow-violet-900/40"
                    >
                      {copiedPrompt1 ? <Check size={11} className="text-emerald-300" /> : <Copy size={11} />}
                      {copiedPrompt1 ? "Tersalin!" : "Salin Prompt"}
                    </button>
                  </div>
                  <div className="max-h-[160px] overflow-y-auto text-[10px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words pr-2">
                    {prompt1Text}
                  </div>
                </div>
              </div>
            </div>

            {/* Kanan: Langkah 2 */}
            <div className="lg:col-span-6 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Langkah 2: Pilih Judul & Tulis Naskah Siap Impor</h3>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Setelah mendapatkan 10 rekomendasi judul dari AI eksternal, masukkan judul terpilih di kolom bawah untuk menghasilkan **Prompt Langkah 2**. Prompt ini akan meminta AI menulis cerita lengkap berformat khusus.
                </p>

                {/* Judul Input */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Judul Terpilih dari AI Eksternal</label>
                  <input
                    type="text"
                    value={selectedTitle}
                    onChange={e => setSelectedTitle(e.target.value)}
                    placeholder="Tempel atau ketik judul terbaik pilihan Anda di sini..."
                    className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:border-emerald-400 focus:bg-white outline-none transition-all shadow-inner font-bold text-slate-700"
                  />
                </div>

                {/* Box Teks Prompt 2 */}
                <div className="relative bg-slate-900 border border-slate-950 rounded-2xl p-4 overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-2.5">
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Prompt Langkah 2 (Naskah Terformat)</span>
                    <button
                      onClick={handleCopyPrompt2}
                      disabled={!selectedTitle.trim()}
                      className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-black hover:bg-emerald-550 transition-all shadow-md shadow-emerald-900/40 disabled:opacity-40"
                    >
                      {copiedPrompt2 ? <Check size={11} className="text-teal-300" /> : <Copy size={11} />}
                      {copiedPrompt2 ? "Tersalin!" : "Salin Prompt"}
                    </button>
                  </div>
                  {selectedTitle.trim() ? (
                    <div className="max-h-[160px] overflow-y-auto text-[10px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-words pr-2">
                      {prompt2Text}
                    </div>
                  ) : (
                    <div className="h-[120px] flex items-center justify-center text-[10px] text-slate-500 font-mono italic text-center">
                      [Tulis judul terpilih di kolom atas terlebih dahulu untuk memunculkan Prompt Langkah 2]
                    </div>
                  )}
                </div>

                {/* Panduan Alur Akhir */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 flex gap-2">
                  <span className="text-sm">🚀</span>
                  <p className="text-[10px] text-emerald-800 leading-relaxed font-bold">
                    Alur Akhir: Salin output cerita berformat khusus dari AI eksternal, lalu buka menu "Import Konten AI" di panel sebelah kiri untuk mem-paste naskah tersebut secara langsung!
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
