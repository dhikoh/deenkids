// ═══════════════════════════════════════════════════════════════
// Scene Prompt Studio v3 — Hybrid Prompt Engine
// Redesigned: meta-instruction approach, not keyword soup
// AI interprets the narration; we provide context + safety rules
// ═══════════════════════════════════════════════════════════════

import {
  VisualStyle, CharacterCard, SceneItem, AgeTarget,
  CAMERA_PRESETS, MOOD_PRESETS, LOCATION_PRESETS, TIME_PRESETS,
  ANIMATION_PRESETS, VISUAL_STYLE_PRESETS, ART_STYLES, RENDERINGS,
  COLOR_MOODS, PLATFORM_TARGETS, AGE_TARGETS,
  MainCharacterRole, MAIN_CHARACTER_ROLES,
  VoiceoverGender, VOICEOVER_GENDERS,
} from './types';
import {
  SceneCategory, SCENE_CATEGORY_PATTERNS, EMOTION_ATMOSPHERE,
  ANIMAL_PATTERNS, HUMAN_REFERENCE_PATTERNS,
  PROPHET_PATTERNS, ANGEL_PATTERNS, ALLAH_PATTERN,
} from './scene-dictionary';

// ═══════════════════════════════════════════════════════════════
// SENTENCE SPLITTER
// ═══════════════════════════════════════════════════════════════

/**
 * Split raw narration text into individual sentences.
 * Handles edge cases: "QS.", "HR.", "SAW.", numbered lists, etc.
 */
export function splitIntoSentences(rawText: string): string[] {
  if (!rawText.trim()) return [];

  // Protect known abbreviations from being split
  let protected_ = rawText;
  const ABBREVIATIONS: [RegExp, string][] = [
    [/QS\./gi, '___QS___'],
    [/HR\./gi, '___HR___'],
    [/SAW\./gi, '___SAW___'],
    [/SWT\./gi, '___SWT___'],
    [/dll\./gi, '___DLL___'],
    [/dsb\./gi, '___DSB___'],
    [/dkk\./gi, '___DKK___'],
    [/No\.\s*(\d)/gi, '___NO___$1'],
    [/(\d+)\./g, '___NUM$1___'],
  ];

  for (const [pattern, replacement] of ABBREVIATIONS) {
    protected_ = protected_.replace(pattern, replacement);
  }

  // Split on sentence boundaries
  const rawSentences = protected_
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  // Restore abbreviations
  const RESTORATIONS: [RegExp, string][] = [
    [/___QS___/g, 'QS.'],
    [/___HR___/g, 'HR.'],
    [/___SAW___/g, 'SAW.'],
    [/___SWT___/g, 'SWT.'],
    [/___DLL___/g, 'dll.'],
    [/___DSB___/g, 'dsb.'],
    [/___DKK___/g, 'dkk.'],
    [/___NO___(\d)/g, 'No. $1'],
    [/___NUM(\d+)___/g, '$1.'],
  ];

  return rawSentences.map(sentence => {
    let restored = sentence;
    for (const [pattern, replacement] of RESTORATIONS) {
      restored = restored.replace(pattern, replacement);
    }
    return restored;
  }).filter(s => s.length > 2); // Filter out fragments
}

// ═══════════════════════════════════════════════════════════════
// SCENE CATEGORY DETECTION (kept from v2)
// ═══════════════════════════════════════════════════════════════

export function detectSceneCategory(text: string): SceneCategory {
  const hasHumanRef = HUMAN_REFERENCE_PATTERNS.test(text);

  for (const entry of SCENE_CATEGORY_PATTERNS) {
    if (entry.patterns.some(p => p.test(text))) {
      // If cosmic/nature/sacred but humans ARE referenced → character scene
      if ((entry.cat === 'cosmic' || entry.cat === 'nature' || entry.cat === 'sacred') && hasHumanRef) {
        return 'character';
      }
      return entry.cat;
    }
  }
  return 'character';
}

// ═══════════════════════════════════════════════════════════════
// SMART AUTO-PRESET DETECTION (kept from v2)
// ═══════════════════════════════════════════════════════════════

export function autoDetectPresets(text: string, category: SceneCategory): {
  mood: string; location: string; timeOfDay: string; camera: string;
} {
  let mood = 'damai', location = 'rumah', timeOfDay = 'pagi', camera = 'medium-shot';

  // Category-based defaults
  switch (category) {
    case 'cosmic': location = 'luar-angkasa'; mood = 'megah'; camera = 'wide-shot'; break;
    case 'nature': location = 'alam'; mood = 'damai'; camera = 'wide-shot'; break;
    case 'historic': location = 'gurun'; mood = 'dramatis'; camera = 'wide-shot'; break;
    case 'mosque': location = 'masjid'; mood = 'damai'; camera = 'wide-shot'; break;
    case 'school': location = 'sekolah'; mood = 'ceria'; break;
    case 'home': location = 'rumah'; mood = 'hangat'; break;
    case 'sacred': location = 'masjid'; mood = 'megah'; camera = 'close-up'; break;
    case 'prophet': location = 'gurun'; mood = 'megah'; camera = 'wide-shot'; break;
  }

  // Smart Emotion override
  for (const em of EMOTION_ATMOSPHERE) {
    if (em.pattern.test(text)) { mood = em.presetId; break; }
  }
  if (/\b(sedih|nangis|kecewa|bersedih|duka|khawatir|takut)\b/i.test(text)) mood = 'serius';
  if (/\b(senang|bahagia|gembira|tertawa|senyum|ceria|wah|seru)\b/i.test(text)) mood = 'ceria';
  if (/\b(doa|mohon|ibadah|sholat|sujud|tangan|amin)\b/i.test(text)) mood = 'damai';
  if (/\b(agung|hebat|luar\s*biasa|sempurna|ciptaan|indah|megah)\b/i.test(text)) mood = 'megah';

  // Smart Location refinement from text
  if (/\bsurga|jannah\b/i.test(text)) location = 'surga';
  if (/\b(masjid|musholla|masjidil)\b/i.test(text)) location = 'masjid';
  if (/\b(gurun|padang\s*pasir|sahara|pasir)\b/i.test(text)) location = 'gurun';
  if (/\b(laut|pantai|samudra|sungai|air|pantai)\b/i.test(text)) location = 'pantai';
  if (/\b(istana|kerajaan|kuno|dahulu|zaman)\b/i.test(text)) location = 'kota-kuno';
  if (/\b(perang|pertempuran|medan|pasukan|musuh)\b/i.test(text)) location = 'medan-perang';
  if (/\b(taman|kebun|bunga|bermain)\b/i.test(text)) location = 'taman';
  if (/\b(kelas|sekolah|belajar|guru|murid)\b/i.test(text)) location = 'sekolah';
  if (/\b(tidur|kamar|ranjang|mimpi)\b/i.test(text)) location = 'kamar';

  // Smart Time refinement
  if (/\b(subuh|fajar|dini\s*hari|pagi\s*buta)\b/i.test(text)) timeOfDay = 'subuh';
  if (/\b(malam|gelap|bulan|bintang|tidur)\b/i.test(text)) timeOfDay = 'malam';
  if (/\b(sore|senja|maghrib|sunset)\b/i.test(text)) timeOfDay = 'sore';
  if (/\b(siang|terik|dzuhur|panas)\b/i.test(text)) timeOfDay = 'siang';
  if (/\b(pagi|terbit|segar|bangun)\b/i.test(text)) timeOfDay = 'pagi';

  // Smart Camera Angle refinement based on context
  if (/\b(doa|tangan|wajah|mata|tangan|bisikan|telinga|detail)\b/i.test(text)) {
    camera = 'close-up';
  } else if (/\b(bumi|langit|luar\s*angkasa|alam|gurun|luas|dunia|pemandangan)\b/i.test(text)) {
    camera = 'wide-shot';
  } else if (/\b(bicara|tanya|diskusi|ibu|anak|sahabat|temen|teman)\b/i.test(text)) {
    camera = 'medium-shot';
  }

  return { mood, location, timeOfDay, camera };
}

// ═══════════════════════════════════════════════════════════════
// VISUAL STYLE RESOLUTION
// ═══════════════════════════════════════════════════════════════

function resolveVisualStyle(presetId: string, customStyle?: VisualStyle) {
  if (presetId === 'custom' && customStyle) {
    const art = ART_STYLES.find(a => a.id === customStyle.artStyle);
    const ren = RENDERINGS.find(r => r.id === customStyle.rendering);
    const col = COLOR_MOODS.find(c => c.id === customStyle.colorMood);
    return { artStyle: art?.label || customStyle.artStyle, rendering: ren?.label || customStyle.rendering, colorMood: col?.label || customStyle.colorMood };
  }
  const preset = VISUAL_STYLE_PRESETS.find(p => p.id === presetId);
  if (preset) return { artStyle: preset.artStyle, rendering: preset.rendering, colorMood: preset.colorMood };
  return { artStyle: "children's book illustration", rendering: 'soft dreamy rendering', colorMood: 'warm pastel color palette' };
}

// ═══════════════════════════════════════════════════════════════
// SAFETY RULES BUILDER
// ═══════════════════════════════════════════════════════════════

function buildSafetyRules(narration: string, backToCamera?: boolean): string {
  const rules: string[] = [];
  const hasProphet = PROPHET_PATTERNS.test(narration);
  const hasAngel = ANGEL_PATTERNS.test(narration);
  const hasAllah = ALLAH_PATTERN.test(narration);
  const hasAnimal = ANIMAL_PATTERNS.test(narration);

  // FACELESS is always mandatory for all living beings
  rules.push('CRITICAL FACELESS RULE: ALL human characters MUST BE COMPLETELY FACELESS. The face area must be perfectly smooth, blank, and featureless. ABSOLUTELY NO eyes, NO nose, NO mouth, and NO eyebrows. Facial expressions must only be conveyed through body posture, head tilt, and hand gestures. This is an absolute religious safety requirement — do not draw facial features under any circumstances.');
  rules.push('Dress code Islami: Perempuan/anak perempuan WAJIB berhijab. Laki-laki/anak laki-laki memakai koko/jubah/peci.');

  if (hasProphet || hasAngel) {
    const entities: string[] = [];
    if (hasProphet) entities.push('Nabi');
    if (hasAngel) entities.push('Malaikat');
    rules.push(`${entities.join(' dan ')}: WAJIB digambar sebagai SILUET CAHAYA saja — outline berjubah putih bercahaya dikelilingi aura emas (nur). DILARANG MENAMPILKAN DETAIL WAJAH ATAU DETAIL TUBUH APAPUN.`);
  }

  if (hasAllah) {
    rules.push('Allah: TIDAK BOLEH digambar dalam bentuk apapun. Tunjukkan hanya keagungan ciptaan-Nya atau kaligrafi Islam.');
  }

  if (hasAnimal) {
    rules.push('CRITICAL ANIMAL FACELESS RULE: All animals (unta, kuda, domba, kucing, burung, dll) MUST BE FACELESS. Their facial area must be blank and smooth with ABSOLUTELY NO eyes, NO nose, and NO mouth. Render them as clean silhouettes or small background elements without facial details.');
  }

  if (backToCamera) {
    rules.push('Tambahan: Semua karakter diposisikan membelakangi kamera/penonton.');
  }

  return rules.join('\n');
}

// ═══════════════════════════════════════════════════════════════
// SHARED: VIDEO CONTEXT BUILDER
// Used by BOTH image and animation prompt generators to ensure
// consistent context injection — no duplication between the two.
// ═══════════════════════════════════════════════════════════════

/** Categories that typically involve character visuals */
const CHARACTER_CATEGORIES: SceneCategory[] = ['character', 'home', 'school', 'mosque', 'historic'];

interface VideoContextParams {
  scene: SceneItem;
  fullNarration: string;
  characters: CharacterCard[];
  sceneIndex: number;
  totalScenes: number;
  mainCharacterRole: MainCharacterRole;
  voiceoverGender: VoiceoverGender;
}

function buildVideoContext(params: VideoContextParams): {
  contextBlock: string;
  characterBlock: string;
  sceneRoleBlock: string;
  continuityBlock: string;
  isCharacterScene: boolean;
} {
  const { scene, fullNarration, characters, sceneIndex, totalScenes, mainCharacterRole, voiceoverGender } = params;

  // Detect scene category
  const category = detectSceneCategory(scene.narration);

  // Determine if this scene involves characters:
  // Manual assignment (characterIds) takes priority over auto-detection
  const involvedChars = characters.filter(c => scene.characterIds.includes(c.id));
  const isCharacterScene = involvedChars.length > 0 || CHARACTER_CATEGORIES.includes(category);

  // ── Context Block: full narration + main character + voiceover ──
  const mainCharOption = MAIN_CHARACTER_ROLES.find(r => r.id === mainCharacterRole);
  const voOption = VOICEOVER_GENDERS.find(v => v.id === voiceoverGender);

  let contextBlock = `═══ ISI KONTEN KESELURUHAN (FULL NARRATION) ═══
Ini adalah scene ${sceneIndex + 1} dari ${totalScenes} dalam SATU VIDEO edukasi anak Islami (Adably.id).
Semua scene merupakan potongan dari satu cerita/konten yang sama — BUKAN video terpisah.`;

  if (mainCharOption && mainCharOption.id) {
    contextBlock += `\nKarakter utama video: ${mainCharOption.promptId}`;
    contextBlock += `\nMeskipun scene tertentu tidak menampilkan karakter ini secara visual (misal: scene kosmik, diagram), karakter ini tetap menjadi subjek utama cerita dan gaya visual harus tetap selaras.`;
  }

  if (voOption && voOption.id) {
    contextBlock += `\nPengisi suara (narator): ${voOption.promptLabel} — sesuaikan gesture dan body language karakter yang bercerita (jika muncul visual) dengan gender narator ini.`;
  }

  contextBlock += `\n\nNarasi lengkap video:\n${fullNarration.trim()}`;

  // ── Character Block: registry + scene-specific ──
  let characterBlock = '';

  if (characters.length > 0) {
    // Always show full registry so AI knows all characters across all scenes
    characterBlock = `\n═══ REGISTRASI KARAKTER (seluruh video) ═══`;
    characterBlock += `\n${characters.map(c => `- ${c.name}: ${c.description} (FACELESS — tanpa wajah)`).join('\n')}`;

    if (isCharacterScene && involvedChars.length > 0) {
      characterBlock += `\n\n→ Scene INI menampilkan: ${involvedChars.map(c => c.name).join(', ')}`;
      characterBlock += `\nPastikan karakter di atas KONSISTEN dengan kemunculan di scene lain — pakaian, warna, proporsi tubuh IDENTIK.`;
    } else if (isCharacterScene) {
      characterBlock += `\n\n→ Scene ini melibatkan karakter (terdeteksi dari narasi). Pastikan konsisten dengan registrasi di atas.`;
    } else {
      characterBlock += `\n\n→ Scene INI: TIDAK menampilkan karakter secara visual.`;
    }
  }

  // ── Scene Role Block: B-Roll vs Character scene ──
  let sceneRoleBlock = '';

  if (!isCharacterScene) {
    // B-Roll / visual pendukung
    const categoryLabels: Record<string, string> = {
      cosmic: 'kosmik/luar angkasa',
      nature: 'alam/pemandangan',
      sacred: 'sakral (Al-Quran, kaligrafi, objek Islami)',
      prophet: 'siluet cahaya nabi',
    };
    const catLabel = categoryLabels[category] || 'non-karakter';

    sceneRoleBlock = `\n═══ PERAN SCENE INI ═══
Tipe: VISUAL PENDUKUNG (B-Roll) — ${catLabel}
Scene ini mengilustrasikan apa yang sedang diceritakan narator. JANGAN menambahkan karakter manusia ke scene ini kecuali memang disebutkan dalam narasi.
WAJIB: Tetap pertahankan art style, color palette, dan visual world yang SAMA dengan scene lain agar terasa sebagai satu video yang koheren.`;
  } else {
    sceneRoleBlock = `\n═══ PERAN SCENE INI ═══
Tipe: SCENE KARAKTER — menampilkan karakter yang berinteraksi/beraksi.
Pastikan karakter KONSISTEN dengan deskripsi di registrasi dan kemunculan di scene sebelumnya.`;
  }

  // ── Continuity Block ──
  let continuityBlock = `\n═══ KONTINUITAS VISUAL ═══
Scene 1 hingga ${totalScenes} adalah SATU VIDEO utuh — BUKAN kumpulan gambar terpisah.
- Art style, color palette, rendering WAJIB IDENTIK di seluruh scene
- Jika karakter muncul kembali setelah scene tanpa karakter, WAJIB identik dengan kemunculan sebelumnya`;

  if (sceneIndex === 0) {
    continuityBlock += `\nIni scene PERTAMA — bangun fondasi visual yang konsisten untuk seluruh scene berikutnya.`;
  } else {
    continuityBlock += `\nPerhatikan scene sebelumnya: pertahankan karakter dan setting jika konteks masih sama. Jika narasi menunjukkan perubahan lokasi/waktu, wajar untuk mengubah setting — tapi art style tetap sama.`;
  }

  return { contextBlock, characterBlock, sceneRoleBlock, continuityBlock, isCharacterScene };
}

// ═══════════════════════════════════════════════════════════════
// HYBRID IMAGE PROMPT GENERATOR (v3)
// ═══════════════════════════════════════════════════════════════

export function generateImagePrompt(
  scene: SceneItem,
  fullNarration: string,
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  characters: CharacterCard[],
  aspectRatio: string,
  selectedAges: string[],
  sceneIndex: number,
  totalScenes: number,
  mainCharacterRole: MainCharacterRole,
  voiceoverGender: VoiceoverGender,
 ): string {
  const style = resolveVisualStyle(visualPresetId, customStyle);

  const category = detectSceneCategory(scene.narration);
  const autoPresets = autoDetectPresets(scene.narration, category);

  const activeLoc = scene.isAutoVisual ? autoPresets.location : scene.location;
  const activeCam = scene.isAutoVisual ? autoPresets.camera : scene.camera;
  const activeMood = scene.isAutoVisual ? autoPresets.mood : scene.mood;
  const activeTime = scene.isAutoVisual ? autoPresets.timeOfDay : scene.timeOfDay;

  const loc = LOCATION_PRESETS.find(l => l.id === activeLoc);
  const cam = CAMERA_PRESETS.find(c => c.id === activeCam);
  const mood = MOOD_PRESETS.find(m => m.id === activeMood);
  const time = TIME_PRESETS.find(t => t.id === activeTime);

  const ageLabels = selectedAges
    .map(id => AGE_TARGETS.find(a => a.id === id))
    .filter(Boolean) as AgeTarget[];
  const ageText = ageLabels.map(a => a.label).join(', ');
  const ageHints = ageLabels.map(a => a.visualHint).join('. ');

  const arMap: Record<string, string> = {
    '16:9': 'horizontal landscape (16:9)',
    '9:16': 'vertical portrait (9:16)',
    '1:1': 'square (1:1)',
  };

  // Build shared video context
  const ctx = buildVideoContext({
    scene, fullNarration, characters, sceneIndex, totalScenes,
    mainCharacterRole, voiceoverGender,
  });

  // Build the meta-instruction prompt
  return `Buatkan gambar ilustrasi untuk web pendidikan anak Islami (adably.id).

Pastikan kamu melihat kalimat yang diminta dan merealisasikan dalam bentuk gambar dengan spesifikasi yang diberikan. Pahami secara mendalam konteks kalimat ini dalam narasi keseluruhan — analisa kalimat-kalimat sebelumnya agar tidak melenceng dari konteks cerita.

Ini untuk penonton usia ${ageText}. Sesuaikan gaya visual: ${ageHints}.

Web ini tidak hanya bertema Islami murni, tapi juga mencakup penjelasan sains, sejarah, cerita fiksi, dan sebagainya — namun tetap pada koridor Islami (hijab, pakaian Islami, dsb). Pahami betul konteks dari isi konten dan kalimat yang diminta.

═══ GAYA VISUAL ═══
Art style: ${style.artStyle}
Rendering: ${style.rendering}
Color mood: ${style.colorMood}
Komposisi: ${arMap[aspectRatio] || arMap['16:9']}
${cam ? `Sudut kamera: ${cam.prompt}` : ''}
${mood ? `Suasana: ${mood.prompt}` : ''}
${time ? `Waktu: ${time.prompt}` : ''}
${loc ? `Lokasi: ${loc.prompt}` : ''}

═══ RULES WAJIB ═══
${buildSafetyRules(scene.narration, scene.backToCamera)}
DO NOT render any text, words, or letters on the image.

${ctx.contextBlock}
${ctx.characterBlock}
${ctx.sceneRoleBlock}
${ctx.continuityBlock}

═══ KALIMAT YANG DIMINTA UNTUK DIBUATKAN GAMBAR ═══
${scene.narration.trim()}`.trim();
}

// ═══════════════════════════════════════════════════════════════
// HYBRID ANIMATION PROMPT GENERATOR (v3)
// ═══════════════════════════════════════════════════════════════

export function generateAnimationPrompt(
  scene: SceneItem,
  fullNarration: string,
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  characters: CharacterCard[],
  aspectRatio: string,
  platformId: string,
  selectedAges: string[],
  sceneIndex: number,
  totalScenes: number,
  mainCharacterRole: MainCharacterRole,
  voiceoverGender: VoiceoverGender,
): string {
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const platform = PLATFORM_TARGETS.find(p => p.id === platformId);

  const category = detectSceneCategory(scene.narration);
  const autoPresets = autoDetectPresets(scene.narration, category);

  const activeLoc = scene.isAutoVisual ? autoPresets.location : scene.location;
  const activeMood = scene.isAutoVisual ? autoPresets.mood : scene.mood;
  const activeTime = scene.isAutoVisual ? autoPresets.timeOfDay : scene.timeOfDay;
  const activeMotion = scene.isAutoVisual
    ? (category === 'cosmic' || category === 'nature' ? 'pan-slow' : 'ambient-glow')
    : scene.animationMotion;

  const motion = ANIMATION_PRESETS.find(a => a.id === activeMotion);
  const loc = LOCATION_PRESETS.find(l => l.id === activeLoc);
  const mood = MOOD_PRESETS.find(m => m.id === activeMood);
  const time = TIME_PRESETS.find(t => t.id === activeTime);

  const ageLabels = selectedAges
    .map(id => AGE_TARGETS.find(a => a.id === id))
    .filter(Boolean) as AgeTarget[];
  const ageText = ageLabels.map(a => a.label).join(', ');

  const arMap: Record<string, string> = {
    '16:9': 'horizontal landscape (16:9)',
    '9:16': 'vertical portrait (9:16)',
    '1:1': 'square (1:1)',
  };

  // Build shared video context
  const ctx = buildVideoContext({
    scene, fullNarration, characters, sceneIndex, totalScenes,
    mainCharacterRole, voiceoverGender,
  });

  return `Buatkan animasi/video pendek dari gambar ilustrasi untuk web pendidikan anak Islami (adably.id).

Untuk penonton usia ${ageText}. Gerakan harus halus, child-friendly, tidak ada elemen menakutkan.

═══ GERAKAN YANG DIMINTA ═══
${motion ? motion.prompt : 'Subtle ambient movement with gentle lighting shifts.'}

═══ GAYA VISUAL ═══
Pertahankan style ${style.artStyle} sepanjang animasi. Tidak boleh ada style drift.
Rendering: ${style.rendering}
Color mood: ${style.colorMood}
Komposisi: ${arMap[aspectRatio] || arMap['16:9']}
${mood ? `Suasana: ${mood.prompt}` : ''}
${time ? `Waktu: ${time.prompt}` : ''}
${loc ? `Lokasi: ${loc.prompt}` : ''}
${platform && platform.id !== 'generic' ? `Durasi: ${platform.maxDuration}` : ''}
Smooth natural motion, konten aman untuk anak.

═══ AUDIO CONTROL (WAJIB MUTLAK) ═══
STRICTLY NO BACKGROUND MUSIC. Absolutely NO background music, NO songs, and NO musical instrumentals.
HOWEVER, clear voiceover narration (matching the scene text) and natural environmental sound effects (SFX like wind blowing, footsteps, water flowing, birds chirping) ARE PERMITTED and highly encouraged if the video generator supports audio generation.

═══ RULES WAJIB ═══
${buildSafetyRules(scene.narration, scene.backToCamera)}

${ctx.contextBlock}
${ctx.characterBlock}
${ctx.sceneRoleBlock}
${ctx.continuityBlock}

═══ KALIMAT SCENE INI ═══
${scene.narration.trim()}`.trim();
}

// ═══════════════════════════════════════════════════════════════
// BATCH GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateAllPrompts(
  scenes: SceneItem[],
  fullNarration: string,
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  characters: CharacterCard[],
  aspectRatio: string,
  platformId: string,
  selectedAges: string[],
  mainCharacterRole: MainCharacterRole,
  voiceoverGender: VoiceoverGender,
): SceneItem[] {
  return scenes.map((scene, i) => ({
    ...scene,
    imagePrompt: generateImagePrompt(
      scene, fullNarration, visualPresetId, customStyle, characters,
      aspectRatio, selectedAges, i, scenes.length,
      mainCharacterRole, voiceoverGender,
    ),
    animationPrompt: generateAnimationPrompt(
      scene, fullNarration, visualPresetId, customStyle, characters,
      aspectRatio, platformId, selectedAges, i, scenes.length,
      mainCharacterRole, voiceoverGender,
    ),
  }));
}
