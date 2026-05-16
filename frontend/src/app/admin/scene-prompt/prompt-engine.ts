// ═══════════════════════════════════════════════════════════════
// Scene Prompt Studio — Prompt Construction Engine (v2)
// Redesigned: contextual scene building, not hardcoded templates
// ═══════════════════════════════════════════════════════════════

import {
  ContentType, VisualStyle, CharacterCard, SceneItem,
  CAMERA_PRESETS, MOOD_PRESETS, LOCATION_PRESETS, TIME_PRESETS,
  ANIMATION_PRESETS, VISUAL_STYLE_PRESETS, ART_STYLES, RENDERINGS,
  COLOR_MOODS, PLATFORM_TARGETS,
} from './types';
import {
  SceneCategory, SCENE_CATEGORY_PATTERNS, SUBJECT_VISUALS,
  CHARACTER_PATTERNS, ACTION_VISUALS, EMOTION_ATMOSPHERE,
  ANIMAL_PATTERNS, ANIMAL_RULE_EN,
} from './scene-dictionary';

// ═══════════════════════════════════════════════════════════════
// ISLAMIC SAFETY RULES (injected into every prompt)
// ═══════════════════════════════════════════════════════════════

const FACELESS_RULE_EN = 'MANDATORY: ALL human characters must be STRICTLY FACELESS — NO facial features whatsoever (no eyes, no nose, no mouth) — completely blank/smooth face area. Expression conveyed ONLY through body language and posture.';
const ISLAMIC_DRESS_RULE = 'Islamic dress code: Women/girls MUST wear modest hijab. Men/boys wear koko/jubah/peci. Proper Islamic attire at all times.';
const PROPHET_SAFETY = 'CRITICAL: Prophets must be represented ONLY as luminous silhouettes surrounded by golden light (nur). STRICTLY FORBIDDEN: any facial features, body details. Only glowing white-robed outline.';
const ALLAH_SAFETY = 'CRITICAL: Allah must NEVER be depicted in any form. Show only the magnificence of creation or Islamic calligraphy/geometric art.';
const BACK_TO_CAMERA_RULE = 'ADDITIONAL SAFETY: All characters are positioned with their backs facing the camera/viewer. Characters are seen from behind.';

// ═══════════════════════════════════════════════════════════════
// CONTENT TYPE DETECTION
// ═══════════════════════════════════════════════════════════════

const QUESTION_PATTERNS = [/^(tahukah|apakah|mengapa|kenapa|bagaimana|siapa|apa|kapan|dimana|berapa)\b/i, /\?$/, /\b(kamu tahu|kamu ketahui)\b/i];
const DALIL_PATTERNS = [/\b(QS\.|surah|surat|ayat|hadits|hadis|hr\.|riwayat|nabi\s+(muhammad|saw))\b/i, /\b(allah\s+(berfirman|swt)|rasulullah)\b/i];
const DIALOG_PATTERNS = [/^["'""']/, /\b(berkata|bertanya|menjawab|bilang|tanya|jawab|ucap)\b/i, /["'""']\s*$/];
const EXPLANATION_PATTERNS = [/\b(adalah|artinya|definisi|pengertian|bermakna|disebut|yaitu|merupakan|hukumnya)\b/i, /\b(wajib|sunnah|haram|makruh|mubah)\b/i];

export function detectContentType(text: string): ContentType {
  const t = text.trim();
  if (DALIL_PATTERNS.some(p => p.test(t))) return 'dalil';
  if (QUESTION_PATTERNS.some(p => p.test(t))) return 'pertanyaan';
  if (DIALOG_PATTERNS.some(p => p.test(t))) return 'dialog';
  if (EXPLANATION_PATTERNS.some(p => p.test(t))) return 'penjelasan';
  return 'narasi';
}

// ═══════════════════════════════════════════════════════════════
// SCENE TEXT SPLITTER
// ═══════════════════════════════════════════════════════════════

export function splitIntoScenes(rawText: string): string[] {
  const marker = /\[(?:Scene|Adegan|scene|adegan)\s*\d*\]/gi;
  if (marker.test(rawText)) {
    return rawText.split(marker).map(s => s.trim()).filter(s => s.length > 0);
  }
  return rawText.split(/\n\s*\n/).map(s => s.trim()).filter(s => s.length > 0);
}

// ═══════════════════════════════════════════════════════════════
// SCENE CATEGORY DETECTION
// ═══════════════════════════════════════════════════════════════

export function detectSceneCategory(text: string): SceneCategory {
  for (const entry of SCENE_CATEGORY_PATTERNS) {
    if (entry.patterns.some(p => p.test(text))) return entry.cat;
  }
  // Check if any character is mentioned → character scene
  if (CHARACTER_PATTERNS.some(cp => cp.pattern.test(text))) return 'character';
  return 'character'; // default
}

// ═══════════════════════════════════════════════════════════════
// SMART AUTO-PRESET DETECTION
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
// CONTEXTUAL VISUAL SCENE BUILDER (replaces old interpretNarrationToVisual)
// ═══════════════════════════════════════════════════════════════

function buildVisualScene(narration: string, category: SceneCategory): string {
  // 1. Try specific subject visual first (most precise)
  for (const sv of SUBJECT_VISUALS) {
    if (sv.pattern.test(narration)) return sv.visual;
  }

  // 2. Category-based scene building
  switch (category) {
    case 'prophet':
      return 'A reverent scene: the Prophet represented ONLY as a LUMINOUS SILHOUETTE — a glowing white-robed outline surrounded by soft golden radiant aura (nur). Background shows the relevant Islamic setting.';
    case 'sacred':
      return 'A beautiful ornate Quran on a decorated wooden rehal stand, pages open with Arabic calligraphy visible. Soft golden light rays, Islamic geometric arabesque patterns, prayer beads and warm lantern nearby. NO human figures.';
    case 'cosmic':
      return 'Magnificent cosmic vista — stars, nebulae, divine light piercing through darkness of space. Ethereal and awe-inspiring. NO human figures.';
    case 'nature':
      return buildNatureScene(narration);
    case 'historic':
      return buildHistoricScene(narration);
    case 'mosque':
      return 'Beautiful mosque interior with ornate Islamic architecture, arched windows with warm light, geometric patterns on walls and ceiling.';
    case 'character':
    default:
      return buildCharacterScene(narration);
  }
}

function buildNatureScene(text: string): string {
  const elements: string[] = [];
  if (/\bgunung\b/i.test(text)) elements.push('majestic mountain landscape');
  if (/\blaut|samudra\b/i.test(text)) elements.push('vast ocean with gentle waves');
  if (/\bsungai\b/i.test(text)) elements.push('flowing river through lush valley');
  if (/\bhujan\b/i.test(text)) elements.push('rain falling from dramatic clouds');
  if (/\bpelangi\b/i.test(text)) elements.push('vibrant rainbow arcing across sky');
  if (/\bhutan|pohon\b/i.test(text)) elements.push('dense forest with tall trees');
  if (elements.length === 0) elements.push('beautiful natural landscape');
  elements.push('Warm atmospheric lighting. Nature-focused scene');
  if (!CHARACTER_PATTERNS.some(cp => cp.pattern.test(text))) {
    elements.push('No human figures — pure nature landscape');
  }
  return elements.join('. ') + '.';
}

function buildHistoricScene(text: string): string {
  const elements: string[] = [];
  if (/\b(kafilah|karavan)\b/i.test(text)) elements.push('caravan of camels crossing desert landscape');
  if (/\b(perang|pertempuran)\b/i.test(text)) elements.push('ancient Arabian battlefield viewed from distance, dust clouds rising');
  if (/\b(istana|kerajaan)\b/i.test(text)) elements.push('grand ancient Middle Eastern palace with Islamic architecture');
  if (/\b(pasar|berdagang)\b/i.test(text)) elements.push('bustling ancient Arabian marketplace with stalls and goods');
  if (/\b(hijrah|perjalanan)\b/i.test(text)) elements.push('travelers journeying through desert under starry sky');
  if (elements.length === 0) elements.push('ancient Middle Eastern setting with Islamic architecture');
  // Detect characters in historic scene
  const chars = CHARACTER_PATTERNS.filter(cp => cp.pattern.test(text));
  if (chars.length > 0) {
    elements.push(...chars.map(c => c.visual));
  }
  elements.push('Historical atmosphere with dramatic lighting');
  return elements.join('. ') + '.';
}

function buildCharacterScene(text: string): string {
  const elements: string[] = [];
  // Detect characters
  const chars = CHARACTER_PATTERNS.filter(cp => cp.pattern.test(text));
  if (chars.length > 0) {
    elements.push(...chars.map(c => c.visual));
  } else {
    // No specific character mentioned — don't force children
    elements.push('FACELESS Muslim figures in proper Islamic attire');
  }
  // Detect actions
  for (const av of ACTION_VISUALS) {
    if (av.pattern.test(text)) { elements.push(av.visual); break; }
  }
  // Detect settings from text
  if (/\b(masjid|musholla)\b/i.test(text)) elements.push('inside a beautiful mosque');
  else if (/\bsekolah|kelas\b/i.test(text)) elements.push('in a bright classroom');
  else if (/\brumah|keluarga\b/i.test(text)) elements.push('in a warm cozy Muslim home');
  else if (/\btaman|bermain\b/i.test(text)) elements.push('in a beautiful garden park');
  else if (/\bpasar\b/i.test(text)) elements.push('in a traditional marketplace');

  elements.push('Warm Islamic atmosphere with gentle lighting');
  return elements.join('. ') + '.';
}

// ═══════════════════════════════════════════════════════════════
// IMAGE PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateImagePrompt(
  scene: SceneItem, visualPresetId: string, customStyle: VisualStyle | undefined,
  characters: CharacterCard[], aspectRatio: string, sceneIndex: number, totalScenes: number,
): string {
  const parts: string[] = [];
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const category = detectSceneCategory(scene.narration);
  const hasProphet = category === 'prophet';
  const hasAllah = /\ballah\b/i.test(scene.narration);
  const hasAnimal = ANIMAL_PATTERNS.test(scene.narration);
  const noLivingBeings = category === 'cosmic' || category === 'sacred';

  // 1. Header
  parts.push('Islamic illustration for Adably educational platform.');

  // 2. Visual concept (translated from narration)
  const visualScene = buildVisualScene(scene.narration, category);
  parts.push(`VISUAL SCENE: ${visualScene}`);

  // 2b. Original narration context — so AI fully understands the paragraph
  parts.push(`SCENE CONTEXT (the illustration must depict this narrative): "${scene.narration.trim()}"`);

  // 3. Character cards (consistency)
  if (!noLivingBeings) {
    const involved = characters.filter(c => scene.characterIds.includes(c.id));
    if (involved.length > 0) {
      parts.push(involved.map(c => `Character "${c.name}": ${c.description}, FACELESS`).join('. '));
    }
  }

  // 4. Location
  const loc = LOCATION_PRESETS.find(l => l.id === scene.location);
  if (loc) parts.push(loc.prompt);

  // 5. Camera
  const cam = CAMERA_PRESETS.find(c => c.id === scene.camera);
  if (cam) parts.push(cam.prompt);

  // 6. Mood
  const mood = MOOD_PRESETS.find(m => m.id === scene.mood);
  if (mood) parts.push(mood.prompt);

  // 7. Time of day
  const time = TIME_PRESETS.find(t => t.id === scene.timeOfDay);
  if (time) parts.push(time.prompt);

  // 8. Visual style
  parts.push(`Art style: ${style.artStyle}. ${style.rendering}. ${style.colorMood}.`);

  // 9. Aspect ratio
  const arMap: Record<string, string> = {
    '16:9': 'Horizontal landscape composition --ar 16:9',
    '9:16': 'Vertical portrait composition --ar 9:16',
    '1:1': 'Square composition --ar 1:1',
  };
  parts.push(arMap[aspectRatio] || arMap['16:9']);

  // 10. Continuity
  if (totalScenes > 1 && sceneIndex > 0) {
    parts.push(`CONTINUITY: Scene ${sceneIndex + 1} of ${totalScenes}. Maintain exact same characters, art style, and color palette.`);
  }

  // 11. Safety rules
  if (!noLivingBeings) {
    parts.push(FACELESS_RULE_EN);
    parts.push(ISLAMIC_DRESS_RULE);
    if (scene.backToCamera) parts.push(BACK_TO_CAMERA_RULE);
  }
  if (hasProphet) parts.push(PROPHET_SAFETY);
  if (hasAllah) parts.push(ALLAH_SAFETY);
  if (hasAnimal) parts.push(ANIMAL_RULE_EN);

  // 12. Quality
  parts.push('Highly detailed, professional quality, child-friendly warm colors, no scary elements.');

  return parts.filter(Boolean).join('. ');
}

// ═══════════════════════════════════════════════════════════════
// ANIMATION PROMPT GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateAnimationPrompt(
  scene: SceneItem, visualPresetId: string, customStyle: VisualStyle | undefined, platformId: string,
): string {
  const parts: string[] = [];
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const platform = PLATFORM_TARGETS.find(p => p.id === platformId);
  const motion = ANIMATION_PRESETS.find(a => a.id === scene.animationMotion);
  const category = detectSceneCategory(scene.narration);

  // 1. Motion
  if (motion) parts.push(motion.prompt);

  // 2. Context-derived motion
  const motionCtx = deriveMotion(scene.narration, category);
  if (motionCtx) parts.push(motionCtx);

  // 3. Safety
  if (category !== 'cosmic' && category !== 'sacred') {
    parts.push('All characters must remain FACELESS throughout animation. Expression only through body movement.');
    if (scene.backToCamera) parts.push('Characters face away from camera at all times.');
  }
  if (category === 'prophet') parts.push('Prophet remains as luminous glowing silhouette only.');
  if (ANIMAL_PATTERNS.test(scene.narration)) parts.push('Animals shown as silhouettes or without facial detail throughout animation.');

  // 4. Style
  parts.push(`Maintain ${style.artStyle} style throughout. No style drift.`);
  if (platform && platform.id !== 'generic') parts.push(`Duration: ${platform.maxDuration}`);
  parts.push('Smooth natural motion, child-friendly content.');

  return parts.filter(Boolean).join('. ');
}

function deriveMotion(text: string, category: SceneCategory): string {
  if (category === 'prophet') return 'Luminous silhouette gently radiating light, nur aura softly pulsing. Background elements move subtly.';
  if (category === 'cosmic') return 'Majestic cosmic animation: stars twinkling, nebulae swirling slowly, divine light rays shifting. No human figures.';
  if (category === 'sacred') return 'Quran pages flutter gently, golden light rays slowly shift, tasbih beads catch light. Sacred ambiance.';
  if (category === 'nature') {
    if (/hujan/i.test(text)) return 'Rain droplets falling, puddles forming, clouds shifting slowly.';
    if (/angin|daun/i.test(text)) return 'Gentle breeze, leaves rustling, fabric swaying softly.';
    return 'Subtle nature animation: clouds drifting, light shifting, gentle wind.';
  }

  const lower = text.toLowerCase();
  if (/berlari|lari|mengejar/.test(lower)) return 'FACELESS character running with dynamic body motion.';
  if (/berjalan|melangkah/.test(lower)) return 'FACELESS character walking forward naturally.';
  if (/menangis|sedih/.test(lower)) return 'Emotional body language: shoulders shaking, head bowed.';
  if (/tersenyum|gembira|senang/.test(lower)) return 'Joyful body language: bouncing, arms raised.';
  if (/sholat|salat|berdoa/.test(lower)) return 'Prayer motion: gentle bowing or hands raised in dua.';
  if (/memeluk/.test(lower)) return 'Two figures embracing warmly, gentle rocking motion.';

  return 'Subtle ambient movement with gentle lighting shifts.';
}

// ═══════════════════════════════════════════════════════════════
// BATCH GENERATOR
// ═══════════════════════════════════════════════════════════════

export function generateAllPrompts(
  scenes: SceneItem[], visualPresetId: string, customStyle: VisualStyle | undefined,
  characters: CharacterCard[], aspectRatio: string, platformId: string,
): SceneItem[] {
  return scenes.map((scene, i) => ({
    ...scene,
    imagePrompt: generateImagePrompt(scene, visualPresetId, customStyle, characters, aspectRatio, i, scenes.length),
    animationPrompt: generateAnimationPrompt(scene, visualPresetId, customStyle, platformId),
  }));
}
