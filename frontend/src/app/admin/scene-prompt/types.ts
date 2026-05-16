// ═══════════════════════════════════════════════════════════════
// Scene Prompt Studio — Types & Preset Data
// ═══════════════════════════════════════════════════════════════

// ─── Core Types ────────────────────────────────────────────────

export interface CharacterCard {
  id: string;
  name: string;
  description: string;
}

export interface SceneItem {
  id: string;
  /** Original narration text */
  narration: string;
  /** Auto-detected or user-selected content type */
  contentType: ContentType;
  /** Camera angle preset */
  camera: string;
  /** Mood/atmosphere preset */
  mood: string;
  /** Location preset */
  location: string;
  /** Time of day preset */
  timeOfDay: string;
  /** Animation motion preset */
  animationMotion: string;
  /** Generated image prompt */
  imagePrompt: string;
  /** Generated animation prompt */
  animationPrompt: string;
  /** Characters involved (references to CharacterCard IDs) */
  characterIds: string[];
  /** If true, characters face away from camera (optional extra safety) */
  backToCamera?: boolean;
}

/** Content type auto-detection or manual override */
export type ContentType = 'narasi' | 'dialog' | 'penjelasan' | 'pertanyaan' | 'dalil';

// ─── Visual Style ──────────────────────────────────────────────

export interface VisualStyle {
  artStyle: string;
  rendering: string;
  colorMood: string;
}

export interface VisualStylePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  artStyle: string;
  rendering: string;
  colorMood: string;
  colorClass: string;
}

export const VISUAL_STYLE_PRESETS: VisualStylePreset[] = [
  {
    id: 'adably-kids',
    name: 'Adably Kids',
    emoji: '🧒',
    description: 'Default — konten edukasi anak',
    artStyle: "children's book illustration",
    rendering: 'soft dreamy rendering with gentle rounded edges',
    colorMood: 'warm pastel color palette with peach, cream, and soft green tones',
    colorClass: 'from-emerald-100 to-amber-100',
  },
  {
    id: 'kisah-islami',
    name: 'Kisah Islami',
    emoji: '🕌',
    description: 'Cerita nabi & sahabat',
    artStyle: 'watercolor painting with Islamic art influences',
    rendering: 'soft luminous glow with delicate brushstrokes',
    colorMood: 'earth tone palette with gold, deep brown, and warm amber accents',
    colorClass: 'from-amber-100 to-orange-100',
  },
  {
    id: 'kartun-3d',
    name: 'Kartun 3D',
    emoji: '🎮',
    description: 'Skenario fun & ceria',
    artStyle: '3D cartoon render style similar to Pixar and Disney',
    rendering: 'sharp detailed rendering with subsurface scattering on skin',
    colorMood: 'vibrant saturated pop colors with bright highlights',
    colorClass: 'from-violet-100 to-pink-100',
  },
  {
    id: 'sinematik',
    name: 'Sinematik',
    emoji: '🎬',
    description: 'Adegan dramatis & serius',
    artStyle: 'photorealistic cinematic still',
    rendering: 'cinematic depth of field with volumetric lighting',
    colorMood: 'natural color grading with teal and orange tones',
    colorClass: 'from-slate-100 to-blue-100',
  },
  {
    id: 'anime-islami',
    name: 'Anime Islami',
    emoji: '✨',
    description: 'Audiens remaja',
    artStyle: 'anime illustration style with clean linework',
    rendering: 'cel-shaded with soft gradient shadows',
    colorMood: 'cool pastel palette with lavender and sky blue accents',
    colorClass: 'from-indigo-100 to-cyan-100',
  },
  {
    id: 'flat-vector',
    name: 'Flat Ilustrasi',
    emoji: '🎨',
    description: 'Infografis & media sosial',
    artStyle: 'flat vector illustration with geometric shapes',
    rendering: 'clean minimal rendering with sharp edges',
    colorMood: 'modern harmonious palette with teal, coral, and warm yellow',
    colorClass: 'from-teal-100 to-rose-100',
  },
];

// ─── Art Style Options (for Custom mode) ──────────────────────

export const ART_STYLES = [
  { id: 'childrens-book', label: "Children's Book Illustration" },
  { id: 'watercolor', label: 'Watercolor Painting' },
  { id: '3d-cartoon', label: '3D Cartoon (Pixar-style)' },
  { id: 'realistic', label: 'Photorealistic' },
  { id: 'anime', label: 'Anime / Manga' },
  { id: 'flat-vector', label: 'Flat Vector Illustration' },
  { id: 'oil-painting', label: 'Oil Painting' },
  { id: 'pencil-sketch', label: 'Pencil Sketch' },
];

export const RENDERINGS = [
  { id: 'soft-dreamy', label: 'Soft & Dreamy' },
  { id: 'sharp-detailed', label: 'Sharp & Detailed' },
  { id: 'cinematic', label: 'Cinematic' },
  { id: 'minimal', label: 'Minimalist' },
  { id: 'cel-shaded', label: 'Cel-Shaded' },
  { id: 'painterly', label: 'Painterly' },
];

export const COLOR_MOODS = [
  { id: 'warm-pastel', label: 'Warm Pastel' },
  { id: 'vibrant-pop', label: 'Vibrant Pop' },
  { id: 'earth-tone', label: 'Earth Tone' },
  { id: 'cool-twilight', label: 'Cool Twilight' },
  { id: 'golden-hour', label: 'Golden Hour' },
  { id: 'moonlit', label: 'Moonlit' },
  { id: 'natural', label: 'Natural' },
];

// ─── Scene Presets ─────────────────────────────────────────────

export const CAMERA_PRESETS = [
  { id: 'close-up', label: 'Close-up', desc: 'Detail tangan/badan', prompt: 'close-up shot focusing on character hands, upper body, and posture details' },
  { id: 'medium-shot', label: 'Medium Shot', desc: 'Setengah badan', prompt: 'medium shot showing character from waist up' },
  { id: 'wide-shot', label: 'Wide Shot', desc: 'Landscape', prompt: 'wide establishing shot showing full environment and characters' },
  { id: 'birds-eye', label: "Bird's Eye", desc: 'Dari atas', prompt: "bird's eye view looking down at the scene" },
  { id: 'low-angle', label: 'Low Angle', desc: 'Dramatis', prompt: 'dramatic low angle shot looking up at character' },
  { id: 'over-shoulder', label: 'Over Shoulder', desc: 'POV percakapan', prompt: 'over-the-shoulder shot from behind one character looking at another' },
];

export const MOOD_PRESETS = [
  { id: 'damai', label: 'Damai', emoji: '🕊️', prompt: 'peaceful serene atmosphere with calm ambient lighting' },
  { id: 'ceria', label: 'Ceria', emoji: '😊', prompt: 'joyful cheerful atmosphere with bright warm lighting' },
  { id: 'serius', label: 'Serius', emoji: '📖', prompt: 'serious contemplative atmosphere with focused directional lighting' },
  { id: 'dramatis', label: 'Dramatis', emoji: '⚡', prompt: 'dramatic intense atmosphere with high contrast lighting and deep shadows' },
  { id: 'misterius', label: 'Misterius', emoji: '🌙', prompt: 'mysterious atmosphere with dim moody lighting and subtle fog' },
  { id: 'hangat', label: 'Hangat', emoji: '🤗', prompt: 'warm intimate atmosphere with cozy golden lighting' },
  { id: 'megah', label: 'Megah', emoji: '👑', prompt: 'grand majestic atmosphere with awe-inspiring scale and ethereal lighting' },
];

export const LOCATION_PRESETS = [
  { id: 'masjid', label: 'Dalam Masjid', prompt: 'inside a beautiful mosque with ornate Islamic geometric patterns, arched windows, and warm sunlight' },
  { id: 'rumah', label: 'Rumah', prompt: 'inside a warm cozy home living room with traditional Islamic decor' },
  { id: 'sekolah', label: 'Sekolah/Kelas', prompt: 'inside a bright cheerful classroom with educational posters and natural light' },
  { id: 'alam', label: 'Alam Terbuka', prompt: 'in a lush green outdoor natural setting with trees, sky, and fresh air' },
  { id: 'pasar', label: 'Pasar', prompt: 'in a bustling traditional marketplace with colorful stalls and goods' },
  { id: 'kamar', label: 'Kamar Anak', prompt: "inside a child's cozy bedroom with toys, books, and soft lighting" },
  { id: 'taman', label: 'Taman/Playground', prompt: 'in a beautiful garden park with flowers, playground, and blue sky' },
  { id: 'gurun', label: 'Gurun/Padang Pasir', prompt: 'in a vast Arabian desert landscape with golden sand dunes and dramatic sky' },
  { id: 'luar-angkasa', label: 'Luar Angkasa/Kosmik', prompt: 'in the vast cosmic expanse of outer space with nebulae, stars, planets, and divine ethereal light' },
  { id: 'kota-kuno', label: 'Kota Kuno', prompt: 'in an ancient Middle Eastern city with mud-brick buildings, narrow streets, and traditional Islamic architecture' },
  { id: 'medan-perang', label: 'Medan Perang', prompt: 'on an open battlefield landscape with dust clouds, distant hills, and dramatic sky' },
  { id: 'pantai', label: 'Pantai/Laut', prompt: 'on a beautiful coastal setting with ocean waves, sandy beach, and vast horizon' },
];

export const TIME_PRESETS = [
  { id: 'subuh', label: 'Subuh', prompt: 'early dawn light with soft purple and pink sky, pre-sunrise glow' },
  { id: 'pagi', label: 'Pagi', prompt: 'bright morning sunlight with clear blue sky and fresh atmosphere' },
  { id: 'siang', label: 'Siang', prompt: 'midday overhead sunlight with vibrant colors' },
  { id: 'sore', label: 'Sore (Golden Hour)', prompt: 'golden hour sunset lighting with warm orange and amber tones' },
  { id: 'malam', label: 'Malam', prompt: 'nighttime scene with moonlight, stars, and cool blue ambient lighting' },
];

// ─── Animation Presets ─────────────────────────────────────────

export interface AnimationPreset {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  prompt: string;
}

export const ANIMATION_PRESETS: AnimationPreset[] = [
  { id: 'ambient', label: 'Ambient', emoji: '🌿', desc: 'Gerakan halus latar', prompt: 'Subtle ambient movement: gentle wind blowing through hair and clothes, light particles floating, soft light shifting. Very slow, peaceful motion.' },
  { id: 'bicara', label: 'Bicara', emoji: '🗣️', desc: 'Karakter berbicara', prompt: 'Character speaking with natural lip movement and gentle facial expressions, slight hand gestures while talking. Maintain character consistency.' },
  { id: 'emosional', label: 'Emosional', emoji: '😢', desc: 'Ekspresi emosi', prompt: 'Emotional expression change on character face, eyes glistening, subtle body language conveying deep feeling. Slow intimate motion.' },
  { id: 'camera-pan', label: 'Camera Pan', emoji: '📷', desc: 'Kamera geser', prompt: 'Smooth cinematic camera pan across the scene from left to right, revealing the full environment. Parallax depth effect.' },
  { id: 'camera-zoom', label: 'Camera Zoom', emoji: '🔍', desc: 'Zoom in dramatis', prompt: 'Slow dramatic camera zoom in towards the main subject, creating focus and intimacy. Background slightly defocuses.' },
  { id: 'aksi', label: 'Aksi', emoji: '🏃', desc: 'Gerakan aktif', prompt: 'Dynamic character movement with natural body mechanics. Active motion with energy and purpose.' },
  { id: 'reveal', label: 'Reveal', emoji: '✨', desc: 'Perlahan terungkap', prompt: 'Slow cinematic reveal: camera gradually pulls back or light gradually illuminates to reveal the full scene. Building anticipation.' },
  { id: 'transisi', label: 'Transisi', emoji: '🔄', desc: 'Morph/transform', prompt: 'Smooth morphing transition between states or scenes. Elements transform fluidly while maintaining visual coherence.' },
];

// ─── Platform Targets ──────────────────────────────────────────

export interface PlatformTarget {
  id: string;
  name: string;
  maxDuration: string;
  promptStyle: string;
}

export const PLATFORM_TARGETS: PlatformTarget[] = [
  { id: 'runway', name: 'Runway Gen-3', maxDuration: '10s', promptStyle: 'Descriptive motion-focused, specify camera movement explicitly' },
  { id: 'kling', name: 'Kling AI', maxDuration: '10s', promptStyle: 'Concise action-focused with clear subject motion description' },
  { id: 'pika', name: 'Pika', maxDuration: '4s', promptStyle: 'Short and direct, focus on single primary motion' },
  { id: 'luma', name: 'Luma Dream Machine', maxDuration: '5s', promptStyle: 'Cinematic style description with camera and subject motion' },
  { id: 'generic', name: 'Generic / Lainnya', maxDuration: '5s', promptStyle: 'Standard motion description' },
];

// ─── Aspect Ratios ─────────────────────────────────────────────

export const SCENE_ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', desc: 'YouTube / Landscape' },
  { id: '9:16', label: '9:16', desc: 'Reels / TikTok' },
  { id: '1:1', label: '1:1', desc: 'Instagram Feed' },
];

// ─── Content Type Detection Keywords ───────────────────────────

export const CONTENT_TYPE_LABELS: Record<ContentType, { label: string; emoji: string; color: string }> = {
  narasi: { label: 'Narasi', emoji: '📖', color: 'bg-emerald-100 text-emerald-700' },
  dialog: { label: 'Dialog', emoji: '💬', color: 'bg-sky-100 text-sky-700' },
  penjelasan: { label: 'Penjelasan', emoji: '📚', color: 'bg-violet-100 text-violet-700' },
  pertanyaan: { label: 'Pertanyaan', emoji: '🤔', color: 'bg-amber-100 text-amber-700' },
  dalil: { label: 'Dalil/Ayat', emoji: '☪️', color: 'bg-rose-100 text-rose-700' },
};
