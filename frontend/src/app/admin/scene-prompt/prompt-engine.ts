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

  // Emotion override
  for (const em of EMOTION_ATMOSPHERE) {
    if (em.pattern.test(text)) { mood = em.presetId; break; }
  }

  // Location refinement from text
  if (/\bsurga|jannah\b/i.test(text)) location = 'surga';
  if (/\b(masjid|musholla)\b/i.test(text)) location = 'masjid';
  if (/\b(gurun|padang\s*pasir|sahara)\b/i.test(text)) location = 'gurun';
  if (/\b(laut|pantai|samudra)\b/i.test(text)) location = 'pantai';
  if (/\b(istana|kerajaan)\b/i.test(text)) location = 'kota-kuno';
  if (/\b(perang|pertempuran|medan)\b/i.test(text)) location = 'medan-perang';
  if (/\b(taman|kebun)\b/i.test(text)) location = 'taman';

  // Time refinement
  if (/\b(subuh|fajar|dini\s*hari)\b/i.test(text)) timeOfDay = 'subuh';
  if (/\b(malam|gelap|bulan)\b/i.test(text)) timeOfDay = 'malam';
  if (/\b(sore|senja|maghrib)\b/i.test(text)) timeOfDay = 'sore';
  if (/\b(siang|terik|dzuhur)\b/i.test(text)) timeOfDay = 'siang';

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
  rules.push('FACELESS: Semua karakter manusia WAJIB tanpa wajah (faceless) — area wajah kosong/halus, TIDAK ADA mata, hidung, atau mulut. Ekspresi hanya melalui bahasa tubuh dan gesture.');
  rules.push('Dress code Islami: Perempuan/anak perempuan WAJIB berhijab. Laki-laki/anak laki-laki memakai koko/jubah/peci.');

  if (hasProphet || hasAngel) {
    const entities: string[] = [];
    if (hasProphet) entities.push('Nabi');
    if (hasAngel) entities.push('Malaikat');
    rules.push(`${entities.join(' dan ')}: WAJIB digambar sebagai SILUET CAHAYA saja — outline berjubah putih bercahaya dikelilingi aura emas (nur). DILARANG menampilkan detail wajah atau tubuh.`);
  }

  if (hasAllah) {
    rules.push('Allah: TIDAK BOLEH digambar dalam bentuk apapun. Tunjukkan hanya keagungan ciptaan-Nya atau kaligrafi Islam.');
  }

  if (hasAnimal) {
    rules.push('Hewan: Semua hewan WAJIB faceless (area wajah polos tanpa detail), ditampilkan sebagai siluet, atau sebagai elemen latar belakang yang sangat kecil.');
  }

  if (backToCamera) {
    rules.push('Tambahan: Semua karakter diposisikan membelakangi kamera/penonton.');
  }

  return rules.join('\n');
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
): string {
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const loc = LOCATION_PRESETS.find(l => l.id === scene.location);
  const cam = CAMERA_PRESETS.find(c => c.id === scene.camera);
  const mood = MOOD_PRESETS.find(m => m.id === scene.mood);
  const time = TIME_PRESETS.find(t => t.id === scene.timeOfDay);
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

  // Build character descriptions
  const involvedChars = characters.filter(c => scene.characterIds.includes(c.id));
  const charBlock = involvedChars.length > 0
    ? `\nKarakter yang muncul di scene ini (pastikan konsisten):\n${involvedChars.map(c => `- ${c.name}: ${c.description} (FACELESS — tanpa wajah)`).join('\n')}`
    : '';

  // Continuity instruction
  const continuity = totalScenes > 1
    ? `\nINSTRUKSI KONTINUITAS: Ini adalah scene ${sceneIndex + 1} dari ${totalScenes}. ${sceneIndex > 0 ? 'Perhatikan gambar sebelumnya agar karakter dan setting tidak berganti jika konteksnya masih sama. Tapi jika kalimat memang menunjukkan perubahan scene/lokasi/waktu, maka wajar untuk mengubahnya — ikuti isi kalimat.' : 'Ini scene pertama — bangun fondasi visual yang konsisten untuk scene berikutnya.'}`
    : '';

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
${charBlock}
${continuity}

═══ ISI KONTEN KESELURUHAN ═══
${fullNarration.trim()}

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
  platformId: string,
  selectedAges: string[],
  sceneIndex: number,
  totalScenes: number,
): string {
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const platform = PLATFORM_TARGETS.find(p => p.id === platformId);
  const motion = ANIMATION_PRESETS.find(a => a.id === scene.animationMotion);
  const ageLabels = selectedAges
    .map(id => AGE_TARGETS.find(a => a.id === id))
    .filter(Boolean) as AgeTarget[];
  const ageText = ageLabels.map(a => a.label).join(', ');

  return `Buatkan animasi/video pendek dari gambar ilustrasi untuk web pendidikan anak Islami.

Untuk penonton usia ${ageText}. Gerakan harus halus, child-friendly, tidak ada elemen menakutkan.

═══ GERAKAN YANG DIMINTA ═══
${motion ? motion.prompt : 'Subtle ambient movement with gentle lighting shifts.'}

═══ RULES WAJIB ═══
${buildSafetyRules(scene.narration, scene.backToCamera)}

═══ GAYA VISUAL ═══
Pertahankan style ${style.artStyle} sepanjang animasi. Tidak boleh ada style drift.
${platform && platform.id !== 'generic' ? `Durasi: ${platform.maxDuration}` : ''}
Smooth natural motion, konten aman untuk anak.
${totalScenes > 1 ? `\nScene ${sceneIndex + 1} dari ${totalScenes}. Pertahankan konsistensi karakter dan warna dari scene sebelumnya.` : ''}

═══ KONTEKS NARASI ═══
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
): SceneItem[] {
  return scenes.map((scene, i) => ({
    ...scene,
    imagePrompt: generateImagePrompt(scene, fullNarration, visualPresetId, customStyle, characters, aspectRatio, selectedAges, i, scenes.length),
    animationPrompt: generateAnimationPrompt(scene, fullNarration, visualPresetId, customStyle, platformId, selectedAges, i, scenes.length),
  }));
}
