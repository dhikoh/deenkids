// Scene Dictionary — keyword-to-visual mapping for prompt engine

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

// ─── Subject/Topic → English Visual Mapping ────────────────────
export const SUBJECT_VISUALS: { pattern: RegExp; visual: string }[] = [
  // Cosmic
  { pattern: /penciptaan\s*(bumi|dunia)/i, visual: 'Earth forming from cosmic dust and swirling nebulae, divine golden light illuminating the newborn planet against the vast darkness of space' },
  { pattern: /penciptaan\s*(langit|alam\s*semesta)/i, visual: 'The vast cosmos being formed — galaxies spiraling into existence, stars igniting with brilliant light, cosmic clouds of gas and dust expanding outward' },
  { pattern: /penciptaan\s*manusia/i, visual: 'Abstract divine creation scene — ethereal light shaping a luminous silhouette form, cosmic golden rays, spiritual atmosphere without detailed human depiction' },
  { pattern: /bintang.*bertasbih|bertasbih.*bintang/i, visual: 'Deep space panorama with countless stars pulsing with rhythmic gentle light as if in worship, galaxies spiraling, cosmic beauty' },
  { pattern: /kiamat|hari\s*akhir/i, visual: 'Dramatic cosmic scene — mountains crumbling into dust, sky splitting apart with intense light, earth trembling, apocalyptic grandeur without gore' },
  { pattern: /surga|jannah/i, visual: 'Ethereal paradise garden with rivers of crystal water, golden light, impossibly beautiful flowers, fruits, and pavilions of light — dreamlike and serene' },
  { pattern: /neraka|jahannam/i, visual: 'Dark foreboding landscape with distant ominous red glow on horizon, smoke rising, desolate terrain — suggestive but not graphic or scary for children' },
  // Nature
  { pattern: /hujan\s*(turun|membasahi|lebat)/i, visual: 'Rain falling from dramatic clouds upon parched earth, droplets catching light, life-giving water reaching dry cracked ground' },
  { pattern: /pelangi/i, visual: 'Magnificent rainbow arcing across clearing sky after rain, vibrant colors, lush green landscape below' },
  { pattern: /gunung.*tinggi|gunung.*megah/i, visual: 'Majestic towering mountain with snow-capped peak reaching into clouds, dramatic lighting' },
  { pattern: /laut.*luas|samudra/i, visual: 'Vast endless ocean stretching to the horizon, waves gently rolling, golden sunlight reflecting off water surface' },
  { pattern: /matahari\s*terbit|fajar/i, visual: 'Breathtaking sunrise over landscape, golden and pink light breaking through clouds, first rays illuminating the earth' },
  { pattern: /matahari\s*terbenam|senja/i, visual: 'Stunning sunset with orange, purple and gold sky, silhouetted landscape, peaceful twilight atmosphere' },
  // Historic
  { pattern: /kafilah.*gurun|gurun.*kafilah/i, visual: 'Long caravan of camels crossing vast golden desert dunes, traders in flowing robes, dramatic sky with warm sunset light' },
  { pattern: /perang\s*(badar|uhud|khandaq)/i, visual: 'Wide shot of ancient Arabian battlefield, dust rising, distant armies on horseback, dramatic clouds and light — shown from far distance' },
  { pattern: /hijrah/i, visual: 'Two luminous silhouette figures journeying through desert at night under brilliant starry sky, full moon, oasis in distance' },
  { pattern: /fathu\s*makkah/i, visual: 'Panoramic view of ancient Makkah city with the Kaaba in center, peaceful atmosphere, golden morning light, crowds approaching from distance' },
  { pattern: /istana|kerajaan/i, visual: 'Grand ancient Middle Eastern palace with ornate Islamic architecture, tall minarets, decorated arches, courtyard with fountain' },
  // Mosque/Worship
  { pattern: /sholat\s*berjamaah/i, visual: 'Interior of beautiful mosque with rows of worshippers in prostration (sujud), warm golden light through arched windows, ornate Islamic patterns' },
  { pattern: /ka'bah|thawaf/i, visual: 'The magnificent Kaaba draped in black cloth with golden calligraphy, pilgrims circling in white ihram garments, Masjid al-Haram surroundings' },
  // General
  { pattern: /\ballah\b/i, visual: 'Magnificent scene showing the grandeur of divine creation — radiant golden light descending from above, cosmic beauty, Islamic geometric patterns framing the scene. NO depiction of Allah in any form' },
];

// ─── Character Detection ───────────────────────────────────────
export const CHARACTER_PATTERNS: { pattern: RegExp; visual: string; isChild: boolean }[] = [
  // Children
  { pattern: /\banak\s*(laki|cowok|putra)\b/i, visual: 'a FACELESS Muslim boy wearing white kopiah/peci and koko shirt', isChild: true },
  { pattern: /\banak\s*(perempuan|cewek|putri)\b/i, visual: 'a FACELESS Muslim girl wearing colorful hijab and modest dress', isChild: true },
  { pattern: /\bmurid\b/i, visual: 'FACELESS Muslim students in school uniforms with Islamic headwear', isChild: true },
  { pattern: /\bbayi\b/i, visual: 'a small FACELESS baby wrapped in soft cloth', isChild: true },
  // Adults - Family
  { pattern: /\b(ayah|bapak|abah|papa|abu)\b/i, visual: 'a FACELESS Muslim father with beard, wearing koko/jubah', isChild: false },
  { pattern: /\b(ibu|mama|ummi|bunda)\b/i, visual: 'a FACELESS Muslim mother wearing modest long hijab and flowing dress', isChild: false },
  { pattern: /\b(kakek|datuk)\b/i, visual: 'an elderly FACELESS Muslim grandfather with white beard, wearing jubah and turban', isChild: false },
  { pattern: /\b(nenek)\b/i, visual: 'an elderly FACELESS Muslim grandmother wearing long hijab', isChild: false },
  { pattern: /\b(kakak|abang)\b/i, visual: 'a FACELESS young Muslim teenager in Islamic attire', isChild: false },
  // Adults - Professions
  { pattern: /\b(ustadz|guru\s*laki|pak\s*guru)\b/i, visual: 'a FACELESS male Muslim teacher (ustadz) in white jubah', isChild: false },
  { pattern: /\b(ustadzah|bu\s*guru)\b/i, visual: 'a FACELESS female Muslim teacher (ustadzah) wearing hijab', isChild: false },
  { pattern: /\b(pedagang|saudagar)\b/i, visual: 'a FACELESS Muslim merchant in traditional trading robes', isChild: false },
  { pattern: /\b(petani)\b/i, visual: 'a FACELESS Muslim farmer in simple working clothes with kopiah', isChild: false },
  { pattern: /\b(nelayan)\b/i, visual: 'a FACELESS Muslim fisherman near a wooden boat', isChild: false },
  { pattern: /\b(prajurit|tentara|mujahid)\b/i, visual: 'FACELESS Muslim warriors in ancient Arabian armor and turbans', isChild: false },
  { pattern: /\b(raja|sultan|khalifah)\b/i, visual: 'a FACELESS Muslim ruler in ornate royal robes and elaborate turban', isChild: false },
  { pattern: /\b(hakim|qadhi)\b/i, visual: 'a FACELESS Muslim judge in dignified robes', isChild: false },
  { pattern: /\b(tabib|dokter)\b/i, visual: 'a FACELESS Muslim healer/physician in traditional attire', isChild: false },
  { pattern: /\b(penggembala)\b/i, visual: 'a FACELESS Muslim shepherd with a staff in open landscape', isChild: false },
  // Groups
  { pattern: /\b(jamaah|umat|kaum)\b/i, visual: 'a group of FACELESS Muslim people in diverse Islamic attire', isChild: false },
  { pattern: /\b(pasukan|bala\s*tentara)\b/i, visual: 'ranks of FACELESS Muslim soldiers in ancient Arabian military gear', isChild: false },
  { pattern: /\b(teman|sahabat|kawan)\b/i, visual: 'FACELESS Muslim companions together', isChild: false },
];

// ─── Action Detection ──────────────────────────────────────────
export const ACTION_VISUALS: { pattern: RegExp; visual: string }[] = [
  // Physical
  { pattern: /\b(berlari|lari|mengejar)\b/i, visual: 'running with dynamic movement' },
  { pattern: /\b(berjalan|melangkah|menuju)\b/i, visual: 'walking forward purposefully' },
  { pattern: /\b(mendaki|memanjat)\b/i, visual: 'climbing upward with determination' },
  { pattern: /\b(berlayar|mengarungi)\b/i, visual: 'sailing across water on a traditional vessel' },
  { pattern: /\b(membangun|mendirikan)\b/i, visual: 'constructing/building with hands' },
  { pattern: /\b(menanam|berkebun)\b/i, visual: 'planting seeds in fertile ground' },
  { pattern: /\b(memanah|melempar)\b/i, visual: 'drawing a bow or throwing with athletic posture' },
  { pattern: /\b(menunggang|berkuda)\b/i, visual: 'riding a horse (horse shown as silhouette or from behind)' },
  // Emotional
  { pattern: /\b(memeluk|berpelukan)\b/i, visual: 'embracing warmly, showing love through body posture' },
  { pattern: /\b(menangis|sedih|air\s*mata)\b/i, visual: 'showing sadness through hunched shoulders and bowed head' },
  { pattern: /\b(tersenyum|gembira|senang|bahagia)\b/i, visual: 'showing joy through raised arms and upright posture' },
  { pattern: /\b(takjub|kagum|terpesona)\b/i, visual: 'showing amazement through leaning back and raised hands' },
  { pattern: /\b(marah|murka)\b/i, visual: 'showing anger through tense posture and clenched fists' },
  { pattern: /\b(takut|gemetar)\b/i, visual: 'showing fear through cowering posture and protective stance' },
  { pattern: /\b(bersyukur|berterima\s*kasih)\b/i, visual: 'showing gratitude with hands raised in thankfulness' },
  { pattern: /\b(merenungi|berpikir|merenung)\b/i, visual: 'in contemplative pose, hand on chin, looking thoughtfully' },
  // Spiritual
  { pattern: /\b(berdoa|doa|bermunajat)\b/i, visual: 'hands raised in heartfelt supplication (dua)' },
  { pattern: /\b(sholat|salat)\b/i, visual: 'in prayer position, serene worship atmosphere' },
  { pattern: /\b(sujud|rukuk)\b/i, visual: 'in prostration/bowing position on prayer mat' },
  { pattern: /\b(membaca\s*(quran|al-quran)|mengaji|tilawah)\b/i, visual: 'reading Quran on a decorated rehal stand' },
  { pattern: /\b(bersedekah|memberi|berbagi)\b/i, visual: 'extending hands to give generously to others' },
  { pattern: /\b(berdakwah|menyampaikan|mengajar)\b/i, visual: 'speaking/teaching with welcoming hand gestures' },
  // Social
  { pattern: /\b(berdagang|jual\s*beli)\b/i, visual: 'trading goods in a marketplace setting' },
  { pattern: /\b(bermusyawarah|berdiskusi)\b/i, visual: 'sitting in circle having earnest discussion' },
  { pattern: /\b(menolong|membantu)\b/i, visual: 'extending helping hand to another person' },
];

// ─── Emotion → Atmosphere Mapping ──────────────────────────────
export const EMOTION_ATMOSPHERE: { pattern: RegExp; mood: string; presetId: string }[] = [
  { pattern: /\b(ujian|penderitaan|kesulitan|cobaan|musibah)\b/i, mood: 'dramatic tense atmosphere with high contrast lighting', presetId: 'dramatis' },
  { pattern: /\b(gembira|senang|syukur|nikmat|bahagia|sukacita)\b/i, mood: 'warm joyful atmosphere with bright golden lighting', presetId: 'ceria' },
  { pattern: /\b(takjub|kagum|megah|agung|kebesaran)\b/i, mood: 'awe-inspiring grand atmosphere with ethereal lighting', presetId: 'megah' },
  { pattern: /\b(sedih|menangis|duka|kehilangan|wafat)\b/i, mood: 'melancholic somber atmosphere with muted soft lighting', presetId: 'serius' },
  { pattern: /\b(damai|tenang|tenteram|harmonis)\b/i, mood: 'peaceful serene atmosphere with gentle warm lighting', presetId: 'damai' },
  { pattern: /\b(misterius|rahasia|tersembunyi|gelap)\b/i, mood: 'mysterious atmosphere with dim moody lighting and subtle fog', presetId: 'misterius' },
  { pattern: /\b(hangat|kasih\s*sayang|cinta|sayang)\b/i, mood: 'warm intimate atmosphere with cozy golden lighting', presetId: 'hangat' },
  { pattern: /\b(perang|pertempuran|konflik|perlawanan)\b/i, mood: 'intense dramatic atmosphere with dust and strong directional light', presetId: 'dramatis' },
];

// ─── Animal FACELESS Rule ──────────────────────────────────────
export const ANIMAL_PATTERNS = /\b(unta|kuda|domba|kambing|kucing|anjing|burung|elang|singa|ular|ikan|gajah|serigala|rubah|kelinci|ayam|lebah|semut|laba-laba|hewan|binatang)\b/i;

export const ANIMAL_RULE_EN = 'ANIMALS: All animals must be FACELESS (smooth blank face area without eyes/nose/mouth), shown as silhouettes, or depicted as very small distant background elements. No realistic animal faces. This follows strict Islamic art guidelines.';
