// ═══════════════════════════════════════════════════════════════
// Scene Prompt Studio — Prompt Construction Engine
// Aligned with Adably Islamic content safety rules
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

// ═══════════════════════════════════════════════════════════════
// ADABLY ISLAMIC CONTENT SAFETY RULES
// These are NON-NEGOTIABLE and injected into EVERY prompt
// ═══════════════════════════════════════════════════════════════

const FACELESS_RULE_ID = 'ATURAN WAJIB: Semua karakter manusia HARUS FACELESS — TIDAK ADA fitur wajah (mata/hidung/mulut) — wajah harus kosong/blank. Ekspresi HANYA ditunjukkan melalui bahasa tubuh dan postur.';

const FACELESS_RULE_EN = 'MANDATORY: ALL human characters must be STRICTLY FACELESS — NO facial features whatsoever (no eyes, no nose, no mouth) — completely blank/smooth face area. Expression conveyed ONLY through body language and posture.';

const ISLAMIC_DRESS_RULE = 'Islamic dress code: Women/girls MUST wear modest hijab. Men/boys wear koko/jubah/peci. Proper Islamic attire at all times.';

/** Patterns that indicate Prophet/Nabi mention */
const PROPHET_PATTERNS = [
  /\bnabi\s+(muhammad|ibrahim|musa|isa|nuh|yusuf|ismail|adam|idris|hud|shaleh|luth|syu'aib|ayyub|dzulkifli|yunus|ilyas|ilyasa|zakaria|yahya|sulaiman|daud|harun)/i,
  /\brasulullah\b/i,
  /\b(saw|shallallahu\s+'alaihi)/i,
  /\bnabi\b/i,
];

/** Patterns that indicate Allah mention */
const ALLAH_PATTERNS = [
  /\ballah\b/i,
  /\bswt\b/i,
  /\btuhan\b/i,
  /\brab(b)?\b/i,
  /\bilahi\b/i,
];

/** Check if text mentions a prophet */
function mentionsProphet(text: string): boolean {
  return PROPHET_PATTERNS.some(p => p.test(text));
}

/** Check if text mentions Allah */
function mentionsAllah(text: string): boolean {
  return ALLAH_PATTERNS.some(p => p.test(text));
}

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
  if (DALIL_PATTERNS.some(p => p.test(trimmed))) return 'dalil';
  if (QUESTION_PATTERNS.some(p => p.test(trimmed))) return 'pertanyaan';
  if (DIALOG_PATTERNS.some(p => p.test(trimmed))) return 'dialog';
  if (EXPLANATION_PATTERNS.some(p => p.test(trimmed))) return 'penjelasan';
  return 'narasi';
}

// ─── Scene Text Auto-Splitter ──────────────────────────────────

export function splitIntoScenes(rawText: string): string[] {
  const markerPattern = /\[(?:Scene|Adegan|scene|adegan)\s*\d*\]/gi;
  if (markerPattern.test(rawText)) {
    return rawText
      .split(markerPattern)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
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
    return { artStyle: preset.artStyle, rendering: preset.rendering, colorMood: preset.colorMood };
  }
  return {
    artStyle: "children's book illustration",
    rendering: 'soft dreamy rendering with gentle rounded edges',
    colorMood: 'warm pastel color palette',
  };
}

// ═══════════════════════════════════════════════════════════════
// SCENE INTERPRETATION
// Transform raw narration into visual scene description
// (NOT just passing through the raw text)
// ═══════════════════════════════════════════════════════════════

/**
 * Interpret narration text into a visual scene description.
 * This is the key function that transforms abstract/educational text
 * into concrete visual imagery while respecting Islamic content rules.
 */
function interpretNarrationToVisual(narration: string, contentType: ContentType): string {
  const hasProphet = mentionsProphet(narration);
  const hasAllah = mentionsAllah(narration);

  // Content-type specific scene interpretation
  switch (contentType) {
    case 'pertanyaan':
      // Question text → curious child scene
      if (hasProphet) {
        return `A FACELESS Muslim child sitting in a mosque, looking up with curious body posture (head tilted, hand on chin), a thought bubble or soft question mark motif floating near the child. Warm golden light streaming through ornate Islamic windows. The child is pondering about a story of the Prophet.`;
      }
      if (hasAllah) {
        return `A FACELESS Muslim child sitting peacefully under a starry sky, looking up at the vast heavens with wonder (shown through body posture — leaning back, arms slightly raised). Crescent moon and stars illuminate the scene with soft ethereal glow. Islamic geometric patterns frame the edges. No depiction of Allah — only the magnificence of His creation.`;
      }
      return `A FACELESS Muslim child with curious body language (head tilted, hand raised to chin in wonder), sitting in a warm, cozy Islamic learning setting. Soft question mark motifs or floating thought bubbles surround the child. Warm inviting atmosphere.`;

    case 'penjelasan':
      // Explanation text → teaching scene
      if (hasProphet) {
        return `A FACELESS Muslim teacher (ustadz/ustadzah in proper Islamic attire — hijab for women, jubah for men) standing before attentive FACELESS Muslim children, gesturing warmly with hands while explaining. Behind the teacher, a beautiful decorated board with Islamic calligraphy. Warm classroom atmosphere with golden light. The lesson is about the Prophet — no depiction of prophets, only reverent atmosphere.`;
      }
      if (hasAllah) {
        return `A FACELESS Muslim teacher (in proper Islamic attire) gently explaining to FACELESS Muslim children seated in a circle. The background features beautiful Islamic geometric patterns, ornate Quran stand, and warm golden ambient lighting. The atmosphere conveys reverence for the divine. No depiction of Allah — focus on the awe and respect in the learning environment.`;
      }
      return `A FACELESS Muslim teacher (ustadz/ustadzah in proper Islamic attire) warmly explaining a concept to a group of attentive FACELESS Muslim children. The teacher gestures naturally with hands. Warm Islamic classroom setting with educational elements and soft lighting.`;

    case 'dialog':
      // Dialog text → conversation scene
      return `Two or more FACELESS Muslim characters engaged in warm conversation — shown through expressive body language (leaning in, hand gestures, open posture). One speaking (hand gesturing) while others listen attentively. Warm cozy home or mosque setting. All wearing proper Islamic attire (hijab for women, koko/peci for boys).`;

    case 'dalil':
      // Quranic verse / Hadith → ornate Islamic art scene
      return `A beautiful ornate Quran resting on a decorated wooden stand (rehal), pages slightly open with visible Arabic calligraphy. Surrounded by soft golden light rays emanating from the book. Islamic geometric arabesque patterns frame the scene. Prayer beads (tasbih) and a warm lantern nearby. Reverent, serene atmosphere. NO human figures — focus entirely on the sacred objects and divine light.`;

    case 'narasi':
    default:
      // Narrative text → interpret the scene described
      if (hasProphet) {
        return `A reverent Islamic scene: the Prophet represented ONLY as a LUMINOUS SILHOUETTE — a glowing white-robed outline surrounded by soft golden radiant aura (nur/light). STRICTLY FORBIDDEN: any facial features, body details, or realistic human form for the Prophet. Only glowing outline and divine light. Background shows the relevant Islamic setting from the story.`;
      }
      if (hasAllah) {
        return `A magnificent scene showing the grandeur of Allah's creation — vast starry sky, majestic mountains, lush gardens, flowing rivers. Ethereal golden and white light fills the scene from above. Islamic geometric patterns weave through the borders. NO depiction of Allah in any form — only the breathtaking beauty of creation that inspires awe and gratitude.`;
      }
      return interpretNarrativeKeywords(narration);
  }
}

/**
 * For narrative text without prophet/Allah mentions,
 * extract visual keywords and build a scene description.
 */
function interpretNarrativeKeywords(narration: string): string {
  const lower = narration.toLowerCase();
  const elements: string[] = [];

  // Detect characters from narration
  if (/\banak\s+laki|anak\s+cowok|putra\b/.test(lower)) {
    elements.push('a FACELESS Muslim boy wearing peci/kopiah');
  }
  if (/\banak\s+perempuan|anak\s+cewek|putri\b/.test(lower)) {
    elements.push('a FACELESS Muslim girl wearing hijab');
  }
  if (/\bayah|bapak|abah|papa\b/.test(lower)) {
    elements.push('a FACELESS Muslim father with beard, wearing koko/jubah');
  }
  if (/\bibu|mama|ummi|bunda\b/.test(lower)) {
    elements.push('a FACELESS Muslim mother wearing modest long hijab');
  }
  if (/\bustadz|guru|pak\s+guru\b/.test(lower)) {
    elements.push('a FACELESS male Muslim teacher (ustadz) in Islamic attire');
  }
  if (/\bustadzah|bu\s+guru\b/.test(lower)) {
    elements.push('a FACELESS female Muslim teacher (ustadzah) wearing hijab');
  }
  if (/\bteman|sahabat|kawan\b/.test(lower)) {
    elements.push('FACELESS Muslim children together as friends');
  }

  // If no specific characters detected, add generic Muslim child
  if (elements.length === 0) {
    elements.push('FACELESS Muslim children in proper Islamic attire');
  }

  // Detect settings/activities
  if (/\bmasjid|musholla|musala\b/.test(lower)) {
    elements.push('inside a beautiful mosque with Islamic architecture');
  }
  if (/\bsholat|salat|ibadah\b/.test(lower)) {
    elements.push('in prayer/worship position, serene atmosphere');
  }
  if (/\bsekolah|kelas|belajar\b/.test(lower)) {
    elements.push('in a bright Islamic school classroom');
  }
  if (/\brumah|keluarga\b/.test(lower)) {
    elements.push('in a warm cozy Muslim home');
  }
  if (/\btaman|bermain\b/.test(lower)) {
    elements.push('in a beautiful garden/park setting');
  }
  if (/\bmenangis|sedih\b/.test(lower)) {
    elements.push('showing sadness through body posture (shoulders drooped, head down)');
  }
  if (/\bsenang|bahagia|gembira\b/.test(lower)) {
    elements.push('showing joy through body posture (arms up, jumping)');
  }
  if (/\bmembaca|quran|al-quran\b/.test(lower)) {
    elements.push('reading Quran on a decorated stand');
  }

  return elements.join('. ') + '. Warm Islamic atmosphere with gentle lighting.';
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
  const hasProphet = mentionsProphet(scene.narration);
  const hasAllah = mentionsAllah(scene.narration);

  // ═══ 1. ADABLY ISLAMIC SAFETY HEADER ═══
  parts.push('Islamic children education illustration for Adably platform.');

  // ═══ 2. SCENE CONTEXT (the actual paragraph topic) ═══
  // This tells the AI WHAT the scene is about — the specific topic/subject
  parts.push(`SCENE CONTEXT — this illustration is about: "${scene.narration.trim()}"`);

  // ═══ 3. VISUAL INTERPRETATION (HOW to draw it) ═══
  // This interprets the narration into safe visual direction
  const visualScene = interpretNarrationToVisual(scene.narration, scene.contentType);
  parts.push(`VISUAL DIRECTION: ${visualScene}`);

  // ═══ 4. CHARACTER DESCRIPTIONS (consistency across scenes) ═══
  const involvedChars = characters.filter(c => scene.characterIds.includes(c.id));
  if (involvedChars.length > 0) {
    const charDesc = involvedChars
      .map(c => `Character "${c.name}": ${c.description}, FACELESS (no facial features)`)
      .join('. ');
    parts.push(charDesc);
  }

  // ═══ 5. LOCATION ═══
  const loc = LOCATION_PRESETS.find(l => l.id === scene.location);
  if (loc) parts.push(loc.prompt);

  // ═══ 6. CAMERA ANGLE ═══
  const cam = CAMERA_PRESETS.find(c => c.id === scene.camera);
  if (cam) parts.push(cam.prompt);

  // ═══ 7. MOOD ═══
  const mood = MOOD_PRESETS.find(m => m.id === scene.mood);
  if (mood) parts.push(mood.prompt);

  // ═══ 8. TIME OF DAY ═══
  const time = TIME_PRESETS.find(t => t.id === scene.timeOfDay);
  if (time) parts.push(time.prompt);

  // ═══ 9. VISUAL STYLE ═══
  parts.push(`Art style: ${style.artStyle}. ${style.rendering}. ${style.colorMood}.`);

  // ═══ 10. ASPECT RATIO ═══
  const arMap: Record<string, string> = {
    '16:9': 'Horizontal landscape composition --ar 16:9',
    '9:16': 'Vertical portrait composition --ar 9:16',
    '1:1': 'Square composition --ar 1:1',
  };
  parts.push(arMap[aspectRatio] || arMap['16:9']);

  // ═══ 11. CONTINUITY (multi-scene) ═══
  if (totalScenes > 1 && sceneIndex > 0) {
    parts.push(`CONTINUITY: This is scene ${sceneIndex + 1} of ${totalScenes}. Maintain exact same characters, same art style, same color palette, and same visual consistency as previous scenes.`);
  }

  // ═══ 12. FACELESS ENFORCEMENT (always — highest priority) ═══
  parts.push(FACELESS_RULE_EN);
  parts.push(ISLAMIC_DRESS_RULE);

  // ═══ 13. PROPHET/ALLAH SAFETY ENFORCEMENT ═══
  if (hasProphet) {
    parts.push('CRITICAL SAFETY: Prophets must be represented ONLY as luminous silhouettes surrounded by golden light (nur). STRICTLY FORBIDDEN: any facial features, body details, or realistic human form for any prophet. Only glowing white-robed outline.');
  }
  if (hasAllah) {
    parts.push('CRITICAL SAFETY: Allah must NEVER be depicted in any form whatsoever. Show only the magnificence of His creation (nature, sky, light) or Islamic calligraphy/geometric art. Absolutely NO anthropomorphic representation.');
  }

  // ═══ 14. QUALITY ═══
  parts.push('Highly detailed, professional quality, child-friendly warm colors, no scary elements.');

  return parts.filter(Boolean).join('. ');
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
  const hasProphet = mentionsProphet(scene.narration);
  const hasAllah = mentionsAllah(scene.narration);

  // 1. Scene context — what this animation is about
  parts.push(`Animate a scene about: "${scene.narration.trim()}"`);

  // 2. Primary motion description
  if (motion) {
    parts.push(motion.prompt);
  }

  // 2. Scene-derived motion context
  const motionContext = deriveMotionFromNarration(scene.narration, scene.contentType, hasProphet, hasAllah);
  if (motionContext) parts.push(motionContext);

  // 3. FACELESS enforcement for animation
  parts.push('CRITICAL: All characters must remain FACELESS throughout animation — no facial features appear at any point. Expression only through body movement.');

  // 4. Prophet/Allah safety for animation
  if (hasProphet) {
    parts.push('Prophet figure remains as luminous glowing silhouette only — light rays gently pulsing. No facial reveal or body detail at any frame.');
  }
  if (hasAllah) {
    parts.push('No depiction of Allah — animate only natural elements (light rays, clouds, stars) and Islamic art patterns.');
  }

  // 5. Style consistency instruction
  parts.push(`Maintain ${style.artStyle} visual style throughout the animation. No style drift or morphing.`);

  // 6. Platform-specific formatting
  if (platform && platform.id !== 'generic') {
    parts.push(`Duration: ${platform.maxDuration}`);
  }

  // 7. General animation quality
  parts.push('Smooth natural motion, no morphing artifacts, consistent character proportions, child-friendly content.');

  return parts.filter(Boolean).join('. ');
}

// ─── Motion Derivation from Narration ─────────────────────────

function deriveMotionFromNarration(
  text: string,
  contentType: ContentType,
  hasProphet: boolean,
  hasAllah: boolean,
): string {
  const lower = text.toLowerCase();

  // Prophet-specific motion
  if (hasProphet) {
    return 'Luminous silhouette gently radiating light, nur aura softly pulsing outward. Background elements move subtly — wind through fabric, light particles drifting.';
  }

  // Allah-specific motion (nature scenes only)
  if (hasAllah) {
    return 'Majestic nature animation: clouds slowly drifting, stars twinkling, light rays descending from above, Islamic geometric patterns subtly rotating. No human figures.';
  }

  // Content-type specific motion
  if (contentType === 'pertanyaan') {
    return 'Character body language shows curiosity: slight head tilt, hand moves to chin, thought bubble appears or question mark gently floats up.';
  }
  if (contentType === 'penjelasan') {
    return 'Teacher character gestures naturally while explaining: hand moves outward in welcoming gesture, children nod with body movement (NOT facial expression).';
  }
  if (contentType === 'dialog') {
    return 'Characters engaged in conversation shown through body language: one leans forward speaking (hand gestures), others lean in listening. Turn-taking body movement.';
  }
  if (contentType === 'dalil') {
    return 'Reverent atmosphere: Quran pages flutter gently, golden light rays slowly shift across the book, tasbih beads catch soft light. Calm, sacred ambiance.';
  }

  // Keyword-based motion detection
  if (/berjalan|melangkah|pergi|menuju/.test(lower)) {
    return 'FACELESS character walking forward with natural gait, body language conveying purpose.';
  }
  if (/berlari|lari|mengejar/.test(lower)) {
    return 'FACELESS character running with dynamic body motion, arms and legs in natural running pose.';
  }
  if (/duduk|terduduk/.test(lower)) {
    return 'FACELESS character in seated position with subtle breathing body movement.';
  }
  if (/menangis|sedih|air mata/.test(lower)) {
    return 'Emotional body language: shoulders gently shaking, head bowed, hands covering face area (concealing already-blank face). Subtle atmospheric sadness.';
  }
  if (/tersenyum|gembira|senang|bahagia/.test(lower)) {
    return 'Joyful body language: character bouncing slightly, arms raised, body posture open and happy (expressed through posture, NOT face).';
  }
  if (/sholat|salat|berdoa|ibadah/.test(lower)) {
    return 'Reverent prayer movement: gentle bowing (ruku/sujud) or hands raised in dua position. Serene atmosphere with soft light.';
  }
  if (/matahari|cahaya|sinar/.test(lower)) {
    return 'Ambient light rays slowly shifting, warm glow intensifying, soft golden particles drifting.';
  }
  if (/angin|daun|pohon/.test(lower)) {
    return 'Gentle breeze effect: leaves rustling, hijab/clothing fabric swaying softly, trees moving naturally.';
  }

  return 'Subtle ambient movement with gentle lighting shifts and soft atmospheric particles.';
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
