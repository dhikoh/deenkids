// ═══════════════════════════════════════════════════════════════
// Scene Dictionary v3 — Keyword detection for auto-preset & safety
// Cleaned: removed mechanical visual mapping (now handled by AI)
// Kept: category detection, emotion mapping, safety patterns
// ═══════════════════════════════════════════════════════════════

// ─── Scene Categories ──────────────────────────────────────────
export type SceneCategory = 'cosmic' | 'nature' | 'historic' | 'mosque' | 'home' | 'school' | 'sacred' | 'prophet' | 'character';

// ─── Keyword → Category Detection ──────────────────────────────
export const SCENE_CATEGORY_PATTERNS: { cat: SceneCategory; patterns: RegExp[] }[] = [
  { cat: 'prophet', patterns: [
    /\bnabi\s+(muhammad|ibrahim|musa|isa|nuh|yusuf|ismail|adam|idris|hud|shaleh|luth|syu'aib|ayyub|dzulkifli|yunus|ilyas|ilyasa|zakaria|yahya|sulaiman|daud|harun)/i,
    /\brasulullah\b/i, /\b(saw|shallallahu\s+'alaihi)/i,
  ]},
  { cat: 'sacred', patterns: [
    /\b(QS\.|surah|surat|ayat)\s/i, /\b(hadits|hadis|hr\.|riwayat)\s/i,
    /\bal-quran\b/i, /\btilawah\b/i,
  ]},
  { cat: 'cosmic', patterns: [
    /\b(penciptaan|mencipta|dicipta)\s*(bumi|langit|alam|semesta|dunia)/i,
    /\balam\s*semesta\b/i, /\bgalaksi\b/i, /\bnebula\b/i, /\bplanet\b/i,
    /\b(bintang|bulan|matahari)\s*(bertasbih|bersinar|terbit|terbenam|diciptakan)/i,
    /\bkiamat\b/i, /\bharisyur\b/i, /\bsurga\b/i, /\bneraka\b/i,
  ]},
  { cat: 'nature', patterns: [
    /\b(hujan|pelangi|petir|badai|topan|banjir|tsunami)\b/i,
    /\b(gunung|laut|sungai|danau|air\s*terjun|oasis)\b/i,
    /\b(hutan|padang|savana|kebun)\s/i,
    /\b(matahari\s*terbit|matahari\s*terbenam|fajar|senja)\b/i,
  ]},
  { cat: 'historic', patterns: [
    /\b(perang|pertempuran|pasukan|prajurit|tentara)\b/i,
    /\b(kafilah|rombongan|karavan|pedagang)\b/i,
    /\b(istana|kerajaan|benteng|singgasana)\b/i,
    /\b(hijrah|badar|uhud|khandaq|tabuk|hunain|fathu\s*makkah)\b/i,
    /\b(mekah|madinah|syam|mesir|palestina|yerusalem)\b/i,
  ]},
  { cat: 'mosque', patterns: [
    /\b(masjid|musholla|musala)\b/i,
    /\b(sholat|salat)\s*(berjamaah|subuh|dzuhur|ashar|maghrib|isya)/i,
    /\b(adzan|iqamah|imam|makmum|khutbah)\b/i,
    /\b(ka'bah|haji|umrah|thawaf|sa'i)\b/i,
  ]},
  { cat: 'school', patterns: [
    /\b(sekolah|kelas|murid|pelajaran|guru)\b/i,
    /\b(ustadz|ustadzah|halaqah|mengaji|belajar\s*bersama)\b/i,
  ]},
  { cat: 'home', patterns: [
    /\b(rumah|dapur|kamar|ruang\s*tamu|ruang\s*keluarga)\b/i,
    /\b(makan\s*bersama|keluarga|sarapan)\b/i,
  ]},
];

// ─── Emotion → Atmosphere Mapping ──────────────────────────────
export const EMOTION_ATMOSPHERE: { pattern: RegExp; mood: string; presetId: string }[] = [
  { pattern: /\b(ujian|penderitaan|kesulitan|cobaan|musibah)\b/i, mood: 'dramatic tense atmosphere', presetId: 'dramatis' },
  { pattern: /\b(gembira|senang|syukur|nikmat|bahagia|sukacita)\b/i, mood: 'warm joyful atmosphere', presetId: 'ceria' },
  { pattern: /\b(takjub|kagum|megah|agung|kebesaran)\b/i, mood: 'awe-inspiring grand atmosphere', presetId: 'megah' },
  { pattern: /\b(sedih|menangis|duka|kehilangan|wafat)\b/i, mood: 'melancholic somber atmosphere', presetId: 'serius' },
  { pattern: /\b(damai|tenang|tenteram|harmonis)\b/i, mood: 'peaceful serene atmosphere', presetId: 'damai' },
  { pattern: /\b(misterius|rahasia|tersembunyi|gelap)\b/i, mood: 'mysterious atmosphere', presetId: 'misterius' },
  { pattern: /\b(hangat|kasih\s*sayang|cinta|sayang)\b/i, mood: 'warm intimate atmosphere', presetId: 'hangat' },
  { pattern: /\b(perang|pertempuran|konflik|perlawanan)\b/i, mood: 'intense dramatic atmosphere', presetId: 'dramatis' },
];

// ─── Safety Detection Patterns ─────────────────────────────────

/** Detects animal references — for faceless animal rule */
export const ANIMAL_PATTERNS = /\b(unta|kuda|domba|kambing|kucing|anjing|burung|elang|singa|ular|ikan|gajah|serigala|rubah|kelinci|ayam|lebah|semut|laba-laba|hewan|binatang)\b/i;

/** Detects human references (pronouns + general human words) — for faceless rule */
export const HUMAN_REFERENCE_PATTERNS = /\b(kita|kami|mereka|dia|ia|saya|aku|engkau|kalian|orang|manusia|umat|hamba|seseorang|teman-teman|teman)\b/i;

/** Detects prophet references */
export const PROPHET_PATTERNS = /\bnabi\s+\w+|rasulullah|\bsaw\b|\bshallallahu/i;

/** Detects angel references */
export const ANGEL_PATTERNS = /\b(malaikat)\s+(jibril|mikail|israfil|izrail|munkar|nakir|raqib|atid|malik|ridwan)\b/i;

/** Detects Allah reference */
export const ALLAH_PATTERN = /\ballah\b/i;
