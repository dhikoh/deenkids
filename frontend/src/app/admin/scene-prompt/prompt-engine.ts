// ═══════════════════════════════════════════════════════════════
// Scene Prompt Studio — Prompt Construction Engine
// ═══════════════════════════════════════════════════════════════

import {
  ContentType,
  VisualStyle,
  CharacterCard,
  SceneItem,
  CAMERA_PRESETS,
  MOOD_PRESETS,
  LOCATION_PRESETS,
  TIME_PRESETS,
  ANIMATION_PRESETS,
  VISUAL_STYLE_PRESETS,
  ART_STYLES,
  RENDERINGS,
  COLOR_MOODS,
  PLATFORM_TARGETS,
} from './types';

// ─── Content Type Auto-Detection ───────────────────────────────

const QUESTION_PATTERNS = [
  /^(tahukah|apakah|mengapa|kenapa|bagaimana|siapa|apa|kapan|dimana|berapa)\b/i,
  /\?$/,
  /\b(kamu tahu|kamu ketahui)\b/i,
];

const DALIL_PATTERNS = [
  /\b(QS\.|surah|surat|ayat|hadits|hadis|hr\.|riwayat|nabi\s+(muhammad|saw))\b/i,
  /\b(allah\s+(berfirman|swt)|rasulullah)\b/i,
];

const DIALOG_PATTERNS = [
  /^["'""]/, // starts with quote
  /\b(berkata|bertanya|menjawab|bilang|tanya|jawab|ucap)\b/i,
  /["'""]\s*$/,
];

const EXPLANATION_PATTERNS = [
  /\b(adalah|artinya|definisi|pengertian|bermakna|disebut|yaitu|merupakan|hukumnya)\b/i,
  /\b(wajib|sunnah|haram|makruh|mubah)\b/i,
];

export function detectContentType(text: string): ContentType {
  const trimmed = text.trim();

  // Check dalil first (highest priority — specific patterns)
  if (DALIL_PATTERNS.some(p => p.test(trimmed))) return 'dalil';

  // Check question
  if (QUESTION_PATTERNS.some(p => p.test(trimmed))) return 'pertanyaan';

  // Check dialog
  if (DIALOG_PATTERNS.some(p => p.test(trimmed))) return 'dialog';

  // Check explanation
  if (EXPLANATION_PATTERNS.some(p => p.test(trimmed))) return 'penjelasan';

  // Default: narrative
  return 'narasi';
}

// ─── Scene Text Auto-Splitter ──────────────────────────────────

/**
 * Split raw text into scene paragraphs.
 * Splits on double newline, or [Scene N] markers.
 */
export function splitIntoScenes(rawText: string): string[] {
  // Check for explicit [Scene N] or [Adegan N] markers
  const markerPattern = /\[(?:Scene|Adegan|scene|adegan)\s*\d*\]/gi;
  if (markerPattern.test(rawText)) {
    return rawText
      .split(markerPattern)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  // Otherwise split on double newline (paragraph breaks)
  return rawText
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ─── Visual Style Resolution ──────────────────────────────────

function resolveVisualStyle(
  presetId: string,
  customStyle?: VisualStyle,
): { artStyle: string; rendering: string; colorMood: string } {
  if (presetId === 'custom' && customStyle) {
    const art = ART_STYLES.find(a => a.id === customStyle.artStyle);
    const ren = RENDERINGS.find(r => r.id === customStyle.rendering);
    const col = COLOR_MOODS.find(c => c.id === customStyle.colorMood);
    return {
      artStyle: art?.label || customStyle.artStyle,
      rendering: ren?.label || customStyle.rendering,
      colorMood: col?.label || customStyle.colorMood,
    };
  }

  const preset = VISUAL_STYLE_PRESETS.find(p => p.id === presetId);
  if (preset) {
    return {
      artStyle: preset.artStyle,
      rendering: preset.rendering,
      colorMood: preset.colorMood,
    };
  }

  // Fallback to Adably Kids
  return {
    artStyle: "children's book illustration",
    rendering: 'soft dreamy rendering with gentle rounded edges',
    colorMood: 'warm pastel color palette',
  };
}

// ─── Content Type Visual Interpretation ───────────────────────

function getContentTypeVisualHint(contentType: ContentType): string {
  switch (contentType) {
    case 'pertanyaan':
      return 'Character with curious questioning expression, slight head tilt, thought bubble or question mark motif in the background';
    case 'penjelasan':
      return 'Character in teaching/explaining pose, gesturing with one hand, warm confident expression';
    case 'dialog':
      return 'Two characters facing each other in conversation, expressive body language and engaged eye contact';
    case 'dalil':
      return 'Beautiful ornate Quran or Islamic manuscript with arabesque decorations, reverent atmosphere';
    case 'narasi':
    default:
      return '';
  }
}

// ─── Image Prompt Generator ───────────────────────────────────

export function generateImagePrompt(
  scene: SceneItem,
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  characters: CharacterCard[],
  aspectRatio: string,
  sceneIndex: number,
  totalScenes: number,
): string {
  const parts: string[] = [];
  const style = resolveVisualStyle(visualPresetId, customStyle);

  // 1. Content type visual hint (for non-narrative types)
  const typeHint = getContentTypeVisualHint(scene.contentType);
  if (typeHint) parts.push(typeHint);

  // 2. Scene description derived from narration
  parts.push(scene.narration.trim());

  // 3. Character descriptions (injected for consistency)
  const involvedChars = characters.filter(c => scene.characterIds.includes(c.id));
  if (involvedChars.length > 0) {
    const charDesc = involvedChars
      .map(c => `Character "${c.name}": ${c.description}`)
      .join('. ');
    parts.push(charDesc);
  }

  // 4. Location
  const loc = LOCATION_PRESETS.find(l => l.id === scene.location);
  if (loc) parts.push(loc.prompt);

  // 5. Camera angle
  const cam = CAMERA_PRESETS.find(c => c.id === scene.camera);
  if (cam) parts.push(cam.prompt);

  // 6. Mood/atmosphere
  const mood = MOOD_PRESETS.find(m => m.id === scene.mood);
  if (mood) parts.push(mood.prompt);

  // 7. Time of day
  const time = TIME_PRESETS.find(t => t.id === scene.timeOfDay);
  if (time) parts.push(time.prompt);

  // 8. Visual style
  parts.push(`${style.artStyle}, ${style.rendering}, ${style.colorMood}`);

  // 9. Aspect ratio hint
  const arMap: Record<string, string> = {
    '16:9': 'horizontal landscape composition --ar 16:9',
    '9:16': 'vertical portrait composition --ar 9:16',
    '1:1': 'square composition --ar 1:1',
  };
  parts.push(arMap[aspectRatio] || arMap['16:9']);

  // 10. Continuity hint (for multi-scene)
  if (totalScenes > 1 && sceneIndex > 0) {
    parts.push('Maintain visual consistency with previous scene: same characters, same art style, same color palette');
  }

  // 11. Quality boosters
  parts.push('highly detailed, professional quality, masterful composition');

  return parts.filter(Boolean).join('. ') + '.';
}

// ─── Animation Prompt Generator ───────────────────────────────

export function generateAnimationPrompt(
  scene: SceneItem,
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  platformId: string,
): string {
  const parts: string[] = [];
  const style = resolveVisualStyle(visualPresetId, customStyle);
  const platform = PLATFORM_TARGETS.find(p => p.id === platformId);
  const motion = ANIMATION_PRESETS.find(a => a.id === scene.animationMotion);

  // 1. Primary motion description
  if (motion) {
    parts.push(motion.prompt);
  }

  // 2. Scene-derived motion context
  const motionContext = deriveMotionFromNarration(scene.narration, scene.contentType);
  if (motionContext) parts.push(motionContext);

  // 3. Style consistency instruction
  parts.push(`Maintain ${style.artStyle} visual style throughout the animation`);

  // 4. Platform-specific formatting
  if (platform && platform.id !== 'generic') {
    parts.push(`Duration: ${platform.maxDuration}`);
  }

  // 5. General animation quality
  parts.push('Smooth natural motion, no morphing artifacts, consistent character proportions');

  return parts.filter(Boolean).join('. ') + '.';
}

// ─── Motion Derivation from Narration ─────────────────────────

function deriveMotionFromNarration(text: string, contentType: ContentType): string {
  const lower = text.toLowerCase();

  // Content-type specific motion
  if (contentType === 'pertanyaan') {
    return 'Character tilts head slightly with curious expression, eyes brightening with wonder';
  }
  if (contentType === 'penjelasan') {
    return 'Character gestures naturally while explaining, confident posture with gentle hand movements';
  }
  if (contentType === 'dialog') {
    return 'Natural conversational lip movement and body language between characters';
  }
  if (contentType === 'dalil') {
    return 'Reverent atmosphere: slow gentle light rays, subtle page flutter or calligraphy glow';
  }

  // Keyword-based motion detection from narration text
  if (/berjalan|melangkah|pergi|menuju/.test(lower)) {
    return 'Character walking forward with natural gait';
  }
  if (/berlari|lari|mengejar/.test(lower)) {
    return 'Character running with dynamic motion';
  }
  if (/duduk|terduduk/.test(lower)) {
    return 'Character in seated position with subtle breathing movement';
  }
  if (/menangis|sedih|air mata/.test(lower)) {
    return 'Emotional moment: tears forming, subtle shoulder movement from sobbing';
  }
  if (/tersenyum|gembira|senang|bahagia/.test(lower)) {
    return 'Character smiling warmly, eyes crinkling with joy';
  }
  if (/sholat|salat|berdoa|ibadah/.test(lower)) {
    return 'Reverent prayer movement: gentle bowing or hand-raising, serene atmosphere';
  }
  if (/matahari|cahaya|sinar/.test(lower)) {
    return 'Ambient light rays slowly shifting, warm glow intensifying';
  }
  if (/angin|daun|pohon/.test(lower)) {
    return 'Gentle breeze: leaves rustling, hair and clothes swaying softly';
  }

  return '';
}

// ─── Full Scene Batch Generator ───────────────────────────────

export function generateAllPrompts(
  scenes: SceneItem[],
  visualPresetId: string,
  customStyle: VisualStyle | undefined,
  characters: CharacterCard[],
  aspectRatio: string,
  platformId: string,
): SceneItem[] {
  return scenes.map((scene, i) => ({
    ...scene,
    imagePrompt: generateImagePrompt(scene, visualPresetId, customStyle, characters, aspectRatio, i, scenes.length),
    animationPrompt: generateAnimationPrompt(scene, visualPresetId, customStyle, platformId),
  }));
}
