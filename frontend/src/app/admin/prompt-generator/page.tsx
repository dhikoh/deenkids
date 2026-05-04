"use client";

import { useState, useEffect } from "react";
import { Wand2, Copy, Check, PenLine, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

type ContentType = "QNA" | "PEMBELAJARAN" | "ARTIKEL" | "KISAH" | "IMAGE_PROMPT";
type KisahSubType = "SIRAH" | "QASHASH" | "TELADAN" | "CERITA_FIKSI";
type ScenePreset = "KELUARGA" | "NABI_SAHABAT" | "KELOMPOK_ANAK" | "TUNGGAL" | "TANPA_MAKHLUK";
type SingleCharType = "ayah" | "ibu" | "anakLaki" | "anakPerempuan";
type AspectRatio = "16:9" | "1:1" | "4:5";

const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; icon: string; desc: string; size: string; arFlag: string }[] = [
  { value: "16:9", label: "Website Thumbnail", icon: "🖥️", desc: "Thumbnail konten di website", size: "1280×720", arFlag: "--ar 16:9" },
  { value: "1:1", label: "IG Feed / FB Post", icon: "📱", desc: "Instagram Feed & Facebook Post", size: "1080×1080", arFlag: "--ar 1:1" },
  { value: "4:5", label: "IG Post Optimal", icon: "📲", desc: "Instagram Post engagement terbaik", size: "1080×1350", arFlag: "--ar 4:5" },
];

const HISTORY_KEY = "adably_prompt_history";
const MAX_HISTORY = 5;

// ─── THINKING MODES DATA ────────────────────────────────────────────────────
// recommendedFor: icons muncul sebagai badge rekomendasi pada UI thinker
// '🗨️' = QNA, '📚' = PEMBELAJARAN, '📝' = ARTIKEL, '📖' = KISAH
const THINKING_MODES = [
  {
    id: "SISTEMATIS",
    label: "Kerangka Berpikir Sistematis & Fundamental",
    emoji: "🔬",
    colorBg: "bg-blue-50",
    colorBorder: "border-blue-200",
    colorText: "text-blue-800",
    colorCheck: "text-blue-600",
    thinkers: [
      {
        id: "aristotle",
        name: "Aristotle",
        desc: "Logika dasar, kategorisasi, sebab-akibat",
        detail: "Bangun setiap argumen dengan logika sebab-akibat yang solid dan kategorisasi yang jelas. Gunakan struktur silogisme: premis besar → premis kecil → kesimpulan.",
        recommend: "🗨️📚📝📖",
        recommendLabel: "Semua tipe",
      },
      {
        id: "descartes",
        name: "René Descartes",
        desc: "Berpikir dari nol, first principles",
        detail: "Mulai dari pertanyaan paling mendasar sebelum membangun penjelasan. Ragukan asumsi umum, lalu bangun argumen dari fondasi yang paling fundamental.",
        recommend: "🗨️📚📝",
        recommendLabel: "QNA, Pembelajaran, Artikel",
      },
      {
        id: "musk",
        name: "Elon Musk",
        desc: "First-principles thinking versi modern",
        detail: "Pecah masalah ke elemen paling dasar, singkirkan asumsi konvensional, lalu bangun ulang solusi dari fondasi logis yang benar.",
        recommend: "📝📚",
        recommendLabel: "Artikel, Pembelajaran",
      },
    ],
  },
  {
    id: "ANALOGI",
    label: "Analogi Cerdas & Penyederhanaan Kompleks",
    emoji: "💡",
    colorBg: "bg-amber-50",
    colorBorder: "border-amber-200",
    colorText: "text-amber-800",
    colorCheck: "text-amber-600",
    thinkers: [
      {
        id: "feynman",
        name: "Richard Feynman",
        desc: "Menjelaskan rumit jadi sederhana",
        detail: "Sederhanakan konsep serumit apapun sehingga bisa dipahami oleh anak kelas 1 SD. Gunakan analogi konkret dari benda atau pengalaman sehari-hari yang dekat dengan anak.",
        recommend: "🗨️📚📝📖",
        recommendLabel: "Semua tipe — terutama analogi",
      },
      {
        id: "sagan",
        name: "Carl Sagan",
        desc: "Analogi luas, perspektif besar & reflektif",
        detail: "Gunakan perumpamaan dari skala luas (alam semesta, waktu, kehidupan) untuk memberi perspektif yang mengagumkan. Buat pembaca merasa kecil namun bermakna.",
        recommend: "📝📖📚",
        recommendLabel: "Artikel, Kisah, Pembelajaran",
      },
    ],
  },
  {
    id: "STRATEGI",
    label: "Strategi & Problem Solving",
    emoji: "♟️",
    colorBg: "bg-violet-50",
    colorBorder: "border-violet-200",
    colorText: "text-violet-800",
    colorCheck: "text-violet-600",
    thinkers: [
      {
        id: "suntzu",
        name: "Sun Tzu",
        desc: "Strategi kompetitif, antisipasi tantangan",
        detail: "Susun argumen secara strategis. Antisipasi keberatan pembaca sebelum muncul. Identifikasi leverage point dan sampaikan pesan pada momen yang paling efektif.",
        recommend: "📝📚",
        recommendLabel: "Artikel, Pembelajaran",
      },
      {
        id: "thiel",
        name: "Peter Thiel",
        desc: "Berpikir unik, berlawanan dari asumsi umum",
        detail: "Temukan sudut pandang yang mengejutkan dan berlawanan dari asumsi mayoritas. Pertanyakan 'apa yang semua orang percaya tapi salah?' dalam topik ini.",
        recommend: "📝",
        recommendLabel: "Artikel",
      },
      {
        id: "grove",
        name: "Andrew Grove",
        desc: "Manajemen krisis, inflection point",
        detail: "Identifikasi momen perubahan kritis dalam topik. Bangun solusi yang scalable dan tahan terhadap tekanan. Fokus pada eksekusi dan hasil nyata.",
        recommend: "📝📚",
        recommendLabel: "Artikel, Pembelajaran",
      },
    ],
  },
  {
    id: "NARASI",
    label: "Narasi Publik, Edukasi & Sosial",
    emoji: "🎙️",
    colorBg: "bg-emerald-50",
    colorBorder: "border-emerald-200",
    colorText: "text-emerald-800",
    colorCheck: "text-emerald-600",
    thinkers: [
      {
        id: "anies",
        name: "Anies Baswedan",
        desc: "Narasi edukatif, terstruktur, relatable",
        detail: "Susun narasi yang menyentuh hati, dekat kehidupan sehari-hari, dan mudah dipahami semua kalangan. Mulai dengan konteks yang relatable, bangun emosi, akhiri dengan harapan.",
        recommend: "📚📝🗨️",
        recommendLabel: "Pembelajaran, Artikel, QNA",
      },
      {
        id: "nadiem",
        name: "Nadiem Makarim",
        desc: "Inovasi pendidikan, berpusat pada peserta didik",
        detail: "Dekati pembelajaran dengan cara yang segar dan membebaskan. Fokus pada kebutuhan nyata anak sebagai subjek belajar, bukan objek. Gunakan pendekatan project-based dan kontekstual.",
        recommend: "📚📝",
        recommendLabel: "Pembelajaran, Artikel",
      },
      {
        id: "gladwell",
        name: "Malcolm Gladwell",
        desc: "Storytelling berbasis insight sosial",
        detail: "Bangun narasi melalui anekdot yang kuat dan insight mengejutkan dari observasi perilaku manusia. Mulai dengan cerita kecil yang konkret, lalu tarik ke pelajaran universal yang besar.",
        recommend: "📝📖",
        recommendLabel: "Artikel, Kisah",
      },
    ],
  },
] as const;

// ─── INTELLECTUAL FRAMEWORK GENERATOR ───────────────────────────────────────
function generateIntellectualFramework(selectedIds: string[], forKisah = false): string {
  const allThinkers = THINKING_MODES.flatMap(m => m.thinkers as unknown as { id: string; name: string; detail: string }[]);
  const chosen = allThinkers.filter(t => selectedIds.includes(t.id));
  if (chosen.length === 0) return "";

  let section = `\n\n══════════════════════════════════════════
KERANGKA BERPIKIR (INTELLECTUAL PERSONA)
══════════════════════════════════════════
Gunakan STRUKTUR BERPIKIR dari tokoh-tokoh berikut — bukan gaya bahasa atau kepribadiannya:

`;
  chosen.forEach(t => {
    section += `• ${t.name} → ${t.detail}\n`;
  });
  section += `
Catatan Penting: Gabungkan framework ini menjadi reasoning yang seimbang dan saling melengkapi. Ambil logika dan cara berpikir mereka — BUKAN cara berbicara atau kepribadiannya.`;
  if (forKisah) {
    section += `
⚠️ Untuk Kisah: Terapkan hanya pada struktur narasi, plot, kualitas analogi, dan penyajian hikmah. JANGAN gunakan untuk menambah atau memodifikasi fakta sejarah. Aturan sumber Sirah/Qashash/Teladan tetap berlaku penuh.`;
  }
  return section;
}

function generateKisahPrompt(subType: KisahSubType, title: string, options: Record<string, boolean>, selectedThinkers: string[]): string {
  const TARGET_USIA = "3–10 tahun";
  const subTypeLabel = subType === "SIRAH" ? "Sirah Nabawiyah (Nabi Muhammad ﻿)" : subType === "QASHASH" ? "Qashashul Anbiya' (Kisah Para Nabi)" : subType === "TELADAN" ? "Teladan Sahabat & Ulama" : "Cerita Fiksi Islami";

  let prompt = `Kamu adalah PENULIS KISAH ISLAMI untuk platform edukasi anak "Adably". Tugasmu membuat naskah kisah yang PANJANG, KAYA DETAIL, dan MENGALIR seperti seorang pencerita ulung — bukan sekadar ringkasan. Konten ini akan DIBACAKAN melalui fitur audio, sehingga setiap kalimat harus terasa hidup, hangat, dan memikat.\n\n`;

  if (subType === "SIRAH") {
    prompt += `══════════════════════════════════════════
ATURAN WAJIB — SIRAH NABAWIYAH (Khusus Nabi Muhammad ﻿)
══════════════════════════════════════════
1. Sub-tipe ini KHUSUS untuk kisah perjalanan hidup Nabi Muhammad ﻿ saja.
2. Ikuti HANYA fakta dari kitab Sirah mu'tabar:
   • Ibnu Hisyam (Sirah Nabawiyah)
   • Ar-Rahiqul Makhtum (Shafiyyurrahman Al-Mubarakfuri)
   • Sirah Ibnu Katsir (Al-Bidayah Wan Nihayah)
3. Dialog/percakapan BOLEH dimuat dalam narasi HANYA jika bersumber dari riwayat shahih.
   Cantumkan sumbernya dalam tanda kurung setelah dialog.
   Contoh: "Wahai Ibrahim, apakah kamu percaya?" (HR. Bukhari no. 1234)
4. JANGAN gambarkan wajah, warna mata, atau ciri fisik detail Nabi. Cukup sebut kemuliaan dan sifat agungnya.
5. JANGAN tambahkan kejadian, dialog, atau detail yang tidak ada dalam riwayat.\n\n`;
  } else if (subType === "QASHASH") {
    prompt += `══════════════════════════════════════════
ATURAN WAJIB — QASHASHUL ANBIYA' (Kisah Para Nabi)
══════════════════════════════════════════
1. Sub-tipe ini untuk kisah para nabi SELAIN Nabi Muhammad ﻿ (Ibrahim, Musa, Yusuf, Nuh, Isa, dll.).
2. Ikuti HANYA fakta dari sumber berikut:
   • Al-Quran (kisah langsung dari ayat — sumber utama)
   • Tafsir Ibnu Katsir
   • Qashashul Anbiya' karya Ibnu Katsir
   • Tafsir Ath-Thabari
   • Al-Bidayah wan Nihayah (Ibnu Katsir)
3. Dialog/percakapan BOLEH dimuat dalam narasi HANYA jika bersumber dari ayat Al-Quran atau riwayat shahih.
   Cantumkan sumbernya. Contoh: "Ya Tuhanku, tunjukkanlah kepadaku..." (QS. Al-Baqarah: 260)
4. JANGAN gambarkan wajah atau ciri fisik detail nabi — cukup sebut sifat, akhlak, dan kemuliaan.
5. JANGAN tambahkan kejadian atau detail yang tidak ada dalam Al-Quran atau riwayat mu'tabar.
6. Jika kisah nabi tersebut disebutkan di beberapa surah, gabungkan secara kronologis dengan menyebut sumber ayat masing-masing.\n\n`;
  } else if (subType === "TELADAN") {
    prompt += `══════════════════════════════════════════
ATURAN WAJIB — TELADAN SAHABAT / ULAMA
══════════════════════════════════════════
1. Ikuti fakta dari kitab tarikh mu'tabar:
   • Siyar A'lam An-Nubala (Imam Adz-Dzahabi)
   • Al-Isabah fi Tamyiz Ash-Shahabah (Ibnu Hajar)
   • Tahdzib Al-Asma (Imam Nawawi)
2. Dialog/percakapan BOLEH dimuat dalam narasi jika bersumber dari riwayat shahih.
   Cantumkan sumbernya. Contoh: "Demi Allah, aku tidak pernah..." (Riwayat Ahmad, 2/345)
3. JANGAN tambahkan kejadian atau dialog fiktif tanpa dasar riwayat.\n\n`;
  } else {
    prompt += `══════════════════════════════════════════
ATURAN WAJIB — CERITA FIKSI ISLAMI
══════════════════════════════════════════
1. Karakter dan cerita BERSIFAT FIKTIF — tidak mengklaim kisah nyata.
2. Nilai Islam (sholat, sedekah, jujur, sabar, dll.) harus TERSELIP ALAMI dalam alur cerita — JANGAN ceramah langsung.
3. Setting: kehidupan sehari-hari anak muslim (keluarga, sekolah, taman, masjid).
4. Dialog antar tokoh BEBAS dibuat sesuai alur cerita yang menarik — tidak membutuhkan sumber.
5. JANGAN cantumkan blok dalil Al-Quran/Hadits terpisah (boleh disebut ringan dalam narasi).\n\n`;
  }

  prompt += `══════════════════════════════════════════
TUGAS
══════════════════════════════════════════
Buatkan konten "${subTypeLabel}" dengan judul: "${title}"
Target pembaca  : Anak usia ${TARGET_USIA}
Gaya penyampaian: PENCERITA — panjang, mengalir, penuh detail adegan & suasana
Panjang minimum : 600–1.000 kata untuk isi kisah utama\n\n`;

  prompt += `══════════════════════════════════════════
FORMAT OUTPUT — METADATA
══════════════════════════════════════════
• Judul    : [judul kisah yang menarik dan sesuai anak]
• Deskripsi: [2–3 kalimat ringkasan yang menggugah rasa ingin tahu]
• Usia     : ${TARGET_USIA}
• Tag      : [4–6 kata kunci relevan, pisahkan koma]\n\n`;

  prompt += `══════════════════════════════════════════
FORMAT OUTPUT — BLOK KONTEN EDITOR ADABLY
══════════════════════════════════════════
Susun konten menggunakan blok-blok berikut. Setiap blok HARUS diisi dengan baik.\n\n`;

  prompt += `━━━ 📝 BLOK 1: ISI KONTEN (paragraph + heading) — WAJIB PANJANG ━━━
Tulis MINIMAL 3 babak kisah. Setiap babak diawali JUDUL BABAK (heading) lalu diikuti 2–4 paragraf narasi panjang.
Gunakan struktur:

[HEADING] Babak 1: [nama babak — misal: "Sebuah Perintah yang Berat"]
[PARAGRAPH] Narasi babak 1 — gambarkan suasana, tokoh, perasaan, detail tempat & waktu. ${subType !== "CERITA_FIKSI" ? "Sisipkan dialog bersumber dalam narasi jika ada." : "Sisipkan dialog antar tokoh yang membuat cerita hidup."}

[HEADING] Babak 2: [nama babak — misal: "Ujian yang Datang"]
[PARAGRAPH] Narasi babak 2 — kembangkan konflik atau perjalanan kisah...

[HEADING] Babak 3: [nama babak — momen klimaks/puncak]
[PARAGRAPH] Narasi babak 3 — klimaks kisah, momen paling menyentuh...

[PARAGRAPH] Penutup naratif — resolusi kisah, suasana akhir yang hangat & bermakna.\n\n`;

  if (subType !== "CERITA_FIKSI") {
    prompt += `━━━ 📖 BLOK 2: DALIL / LANDASAN (dalil) ━━━
Cantumkan 1–2 ayat Al-Quran atau Hadits Shahih yang paling relevan dengan tema kisah.
Format per dalil:
• Arabic  : [teks arab]
• Terjemah: [terjemahan bahasa Indonesia]
• Sumber  : [nama surah + ayat, atau kitab hadits + nomor]
Tempatkan di posisi paling bermakna (sebelum klimaks atau setelah narasi utama).\n\n`;
  }

  if (options.analogi) {
    const bloknr = subType !== "CERITA_FIKSI" ? "3" : "2";
    prompt += `━━━ 🧩 BLOK ${bloknr}: ANALOGI SEDERHANA (analogy) ━━━
Buat 1 analogi singkat yang membantu anak usia ${TARGET_USIA} memahami hikmah utama kisah.
Gunakan perumpamaan dari kehidupan sehari-hari (tumbuhan, air, teman bermain, mainan, dll.).
Format:
• Judul Analogi: [nama analogi singkat]
• Penjelasan   : [2–3 kalimat yang mudah dipahami anak]\n\n`;
  }

  const tipBlockNr = subType !== "CERITA_FIKSI" ? (options.analogi ? "4" : "3") : (options.analogi ? "3" : "2");
  prompt += `━━━ ℹ️ BLOK ${tipBlockNr}: CATATAN / TIPS (tip) ━━━
Hikmah dan pelajaran utama dari kisah ini — untuk anak sekaligus panduan orang tua/pendidik.
Tulis 3–4 poin hikmah praktis, hangat, dan memotivasi — BUKAN ceramah.
Format per poin:
• 💡 [poin hikmah yang singkat namun bermakna]\n\n`;

  if ((subType === "SIRAH" || subType === "QASHASH" || subType === "TELADAN") && options.referensi) {
    prompt += `━━━ 📚 REFERENSI SUMBER (dalil — tipe referensi) ━━━
Cantumkan sumber kitab utama rujukan kisah ini.
Format:
• Kitab  : [judul kitab]
• Penulis: [nama ulama pengarang]
• Hal./No.: [nomor halaman atau hadits]\n\n`;
  }

  prompt += `══════════════════════════════════════════
PANDUAN PENULISAN — GAYA PENCERITA
══════════════════════════════════════════
✅ Tulis seperti MENDONGENG — gambarkan suasana, cuaca, perasaan, warna, suara
✅ Gunakan kalimat aktif yang hidup: "Matanya berbinar...", "Angin berhembus pelan..."
✅ Setiap babak harus punya KONFLIK kecil dan RESOLUSI yang memuaskan
✅ Bahasa SEDERHANA tapi KAYA — anak usia 3–10 tahun bisa memahaminya saat didengarkan
✅ Konten ini akan DIBACAKAN audio — pastikan kalimat enak didengar & mengalir
✅ Nilai Islam terasa ALAMI dalam cerita — tidak dipaksakan
✅ Akhiri dengan kehangatan, rasa syukur, atau motivasi yang menyentuh
❌ JANGAN terlalu singkat — ini bukan ringkasan, ini KISAH LENGKAP
❌ JANGAN menggurui atau berceramah langsung kepada pembaca`;

  // === BLOK HIKMAH (semua sub-type kisah) ===
  prompt += `\n\n━━━ ✨ BLOK HIKMAH / PELAJARAN (hikmah) ━━━
Pelajaran utama yang dapat dipetik dari kisah ini.
Tulis hikmah yang menyentuh hati, relevan bagi anak, dan menginspirasi kebaikan.
Gunakan nada hangat dan penuh harapan — bukan menggurui.
Format:
• Hikmah: [1–3 paragraf refleksi yang bermakna]\n`;

  // === BLOK DOA (SIRAH, QASHASH, TELADAN = wajib shahih; CERITA_FIKSI = boleh narasi) ===
  if (subType !== "CERITA_FIKSI") {
    prompt += `\n━━━ 🤲 BLOK DOA (doa) ━━━
Doa yang relevan dengan tema kisah ini.

⚠️ ATURAN KETAT DOA:
1. WAJIB bersumber dari Al-Quran atau Hadits SHAHIH SAJA.
2. DILARANG KERAS mencantumkan doa dari hadits dha'if, maudhu' (palsu), atau munkar.
3. Setiap doa WAJIB disertai sumber yang jelas dan dapat diverifikasi.
4. Jika tidak ada doa shahih spesifik untuk kisah ini, gunakan doa umum dari Al-Quran yang relevan.

Format per doa:
• Judul : [nama doa singkat]
• Arab  : [teks arab doa]
• Terjemah: [terjemahan bahasa Indonesia]
• Sumber: [QS. ... atau HR. Bukhari/Muslim No. ...]\n`;
  } else {
    prompt += `\n━━━ 🤲 BLOK DOA (doa) — Opsional ━━━
Boleh menyisipkan doa sederhana dalam narasi cerita.
Jika ingin mencantumkan doa spesifik dengan sumber, WAJIB dari Al-Quran/Hadits Shahih saja.
Format (jika digunakan):
• Judul : [nama doa singkat]
• Arab  : [teks arab doa]
• Terjemah: [terjemahan]
• Sumber: [sumber shahih]\n`;
  }

  // Inject intellectual framework if thinkers selected
  const framework = generateIntellectualFramework(selectedThinkers, true);
  if (framework) prompt += framework;

  return prompt;
}

function generatePrompt(type: ContentType, title: string, ages: string[], options: Record<string, boolean>, kisahSubType?: KisahSubType, selectedThinkers: string[] = [], artikelPov: string = ""): string {
  if (type === "KISAH") return generateKisahPrompt(kisahSubType || "SIRAH", title, options, selectedThinkers);
  const ageLabel = ages.length ? ages.map(a => a === "Semua Usia" ? "semua usia" : `${a} tahun`).join(", ") : "semua usia";

  const typeLabel = type === "QNA" ? "Tanya Jawab" : type === "PEMBELAJARAN" ? "Pembelajaran" : "Artikel";

  // === BAGIAN 1: ROLE & KORIDOR ===
  let prompt = `Kamu adalah penulis konten islami untuk platform edukasi anak bernama Adably. Platform ini menyajikan konten parenting islami untuk anak-anak.

KORIDOR KONTEN YANG WAJIB DIIKUTI:
1. Seluruh konten HARUS bersumber dari Al-Quran dan Hadits Shahih sesuai pemahaman Salafus Shalih (Sahabat, Tabi'in, Tabi'ut Tabi'in).
2. JANGAN mencantumkan hadits dha'if atau maudhu' tanpa keterangan status hadits.
3. Jika terdapat lebih dari 1 sumber hukum (Al-Quran, Hadits, Ijma', Qiyas), semuanya WAJIB dicantumkan.`;

  if (options.perbedaanPendapat) {
    prompt += `
4. Jika terdapat perbedaan pendapat di kalangan ulama, sampaikan pendapat-pendapat tersebut beserta dalil masing-masing secara adil dan berimbang.`;
  }

  prompt += `
5. Konten tidak boleh mengandung unsur SARA, ujaran kebencian, atau fitnah.
6. Gunakan bahasa yang lembut, ramah anak, dan mudah dipahami oleh anak usia ${ageLabel}.
7. Jangan membuat konten yang menakut-nakuti anak.

`;

  // === BAGIAN 2: KONTEKS ===
  prompt += `═══════════════════════════════════════
TUGAS:
Buatkan konten "${typeLabel}" dengan judul: "${title}"
Target pembaca: anak usia ${ageLabel}
`;

  // Inject POV for ARTIKEL type
  if (type === "ARTIKEL" && artikelPov) {
    const povDesc = artikelPov === "ORTU"
      ? "Sudut Pandang: ORANG TUA → Tulis untuk orang tua yang ingin mendidik anak. Gunakan bahasa orang dewasa yang reflektif, empatis, dan actionable (bisa langsung dipraktikkan). Fokus pada tips, panduan parenting, dan insight mendidik."
      : "Sudut Pandang: ANAK → Tulis dari perspektif anak atau untuk anak yang lebih dewasa (10-13 tahun). Gunakan bahasa yang relatable, segar, dan memotivasi. Fokus pada pengalaman, rasa ingin tahu, dan pembentukan karakter anak.";
    prompt += `${povDesc}\n`;
  }

  prompt += `═══════════════════════════════════════

`;

  // === BAGIAN 3: FORMAT TEKNOLOGI EDITOR ===
  prompt += `FORMAT OUTPUT YANG HARUS KAMU IKUTI:

Platform kami menggunakan sistem "Blok Konten". Kamu HARUS memberikan output dalam format blok-blok berikut. Kamu bebas menyusun blok dalam urutan apapun dan jumlah berapapun — tidak ada aturan wajib berapa kali setiap blok harus muncul.

═══ METADATA ═══
- Judul: [judul konten yang menarik]
- Deskripsi Singkat: [1-2 kalimat ringkasan konten]
- Kelompok Usia: ${ageLabel}
- Tag: [3-5 kata kunci relevan, dipisah koma]

═══ BLOK KONTEN ═══

`;

  // Blok sesuai tipe
  prompt += `📝 BLOK: ISI KONTEN (paragraph)
Teks narasi atau penjelasan utama. Gunakan bahasa yang mudah dipahami anak.

`;

  if (type === "QNA") {
    prompt += `💡 BLOK: JAWABAN INSTAN (quick_answer)
Jawaban singkat dan langsung yang bisa dibacakan ke anak. Maksimal 2-3 kalimat. Ini adalah jawaban ringkas sebelum penjelasan detail.

💬 BLOK: SIMULASI DIALOG (dialog)
Percakapan antara 2 ORANG SAJA: Anak dengan Ibu ATAU Anak dengan Ayah.
PENTING: Dalam 1 blok dialog bisa ada BANYAK baris percakapan bolak-balik.
Tidak ada aturan khusus berapa baris — buat sealami mungkin seperti percakapan keluarga muslim di rumah.

Format yang harus kamu ikuti:
---
DIALOG:
- [Anak] "Bunda, kenapa kita harus sholat?"
- [Ibu] "Karena sholat adalah perintah Allah, sayang."
- [Anak] "Tapi kenapa harus 5 kali?"
- [Ibu] "Karena Allah tahu itu yang terbaik untuk kita."
---
(Gunakan [Anak] dan [Ibu] atau [Anak] dan [Ayah] sebagai speaker)

`;
  }

  if (options.dalil) {
    prompt += `📖 BLOK: DALIL/LANDASAN (dalil)
Sumber hukum Islam yang relevan. PENTING: Dalam 1 blok dalil bisa ada BANYAK sumber dalil sekaligus. Setiap dalil berisi:
- Teks Arab (jika tersedia)
- Terjemahan / isi dalil dalam Bahasa Indonesia
- Sumber yang JELAS (contoh: QS. Al-Baqarah: 43, HR. Bukhari No. 8, HR. Muslim No. 16)

Format yang harus kamu ikuti:
---
DALIL:
Dalil 1:
  Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
  Terjemahan: "Sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman."
  Sumber: QS. An-Nisa: 103

Dalil 2:
  Arab: (jika ada)
  Terjemahan: "..."
  Sumber: HR. Bukhari No. ...
---

`;
  }

  if (options.analogi) {
    prompt += `🧩 BLOK: ANALOGI SEDERHANA (analogy)
Perumpamaan yang mudah dipahami anak sesuai usianya. Berisi:
- Judul analogi (singkat)
- Isi analogi (gunakan perumpamaan dari kehidupan sehari-hari anak)

Format:
---
ANALOGI:
Judul: "Sholat Seperti Makan"
Isi: "Bayangkan kalau kamu tidak makan seharian, pasti lemas kan? Nah, sholat itu makanan untuk hati kita..."
---

`;
  }

  if (options.tips && type !== "ARTIKEL") {
    prompt += `ℹ️ BLOK: TIPS ORANG TUA (tip)
Tips praktis untuk orang tua dalam menjelaskan topik ini ke anak di rumah.

Format:
---
TIPS:
"Ajak anak sholat bersama sejak usia 7 tahun dengan lembut, tanpa memaksa."
---

`;
  }

  // === BLOK HIKMAH ===
  prompt += `✨ BLOK: HIKMAH / PELAJARAN (hikmah)
Pelajaran utama atau refleksi mendalam dari topik ini.
Tulis 1–3 poin hikmah yang menyentuh hati dan relevan dengan kehidupan anak/orang tua.
Gunakan bahasa yang reflektif, hangat, dan memotivasi — BUKAN menggurui.

Format:
---
HIKMAH:
"Dari pembahasan ini kita belajar bahwa..."
---

`;

  // === BLOK DOA ===
  prompt += `🤲 BLOK: DOA (doa)
Doa yang relevan dengan topik pembahasan.

⚠️ ATURAN KETAT DOA:
1. WAJIB bersumber dari Al-Quran atau Hadits SHAHIH SAJA.
2. DILARANG KERAS mencantumkan doa dari hadits dha'if, maudhu' (palsu), atau munkar — meskipun populer di masyarakat.
3. Setiap doa WAJIB disertai sumber yang jelas dan dapat diverifikasi.
4. Jika tidak ada doa shahih yang spesifik untuk topik ini, gunakan doa umum dari Al-Quran/Sunnah yang relevan.

Format:
---
DOA:
Judul: "Doa Memohon Ilmu yang Bermanfaat"
Arab: رَبِّ زِدْنِي عِلْمًا
Terjemahan: "Ya Tuhanku, tambahkanlah kepadaku ilmu."
Sumber: QS. Thaha: 114
---

`;

  // === BAGIAN 4: PANDUAN USIA ===
  prompt += `
═══ PANDUAN PENYESUAIAN USIA ═══
`;

  if (ages.includes("3-5")) {
    prompt += `- Usia 3-5 tahun: Gunakan kalimat SANGAT sederhana (3-5 kata per kalimat). Analogi dari mainan, hewan, makanan kesukaan anak. Dialog sangat pendek dan lucu.
`;
  }
  if (ages.includes("5-7")) {
    prompt += `- Usia 5-7 tahun: Gunakan kalimat sederhana. Analogi dari sekolah, teman, keluarga. Boleh sedikit lebih panjang.
`;
  }
  if (ages.includes("7-10")) {
    prompt += `- Usia 7-10 tahun: Boleh lebih detail. Analogi dari kehidupan sehari-hari. Anak sudah bisa memahami konsep sebab-akibat.
`;
  }
  if (ages.includes("10-13")) {
    prompt += `- Usia 10-13 tahun: Bisa lebih kompleks dan mendalam. Boleh sertakan penjelasan ilmiah sederhana. Anak sudah bisa berpikir kritis.
`;
  }
  if (ages.includes("Semua Usia") || ages.length === 0) {
    prompt += `- Semua usia: Gunakan bahasa yang universal, mudah dipahami semua kalangan usia anak.
`;
  }

  prompt += `
═══ CATATAN AKHIR ═══
- Susun blok-blok di atas dalam urutan yang PALING LOGIS dan MENGALIR untuk dibaca
- Pastikan setiap dalil memiliki sumber yang jelas dan bisa diverifikasi
- Buat konten yang menarik, tidak membosankan, dan membuat anak ingin terus membaca
- Jangan terlalu panjang — cukup padat dan bermakna`;

  // Inject intellectual framework if thinkers selected
  const framework = generateIntellectualFramework(selectedThinkers, false);
  if (framework) prompt += framework;

  return prompt;
}

function buildCharacterSpec(
  scenePreset: ScenePreset,
  familyChars: { ayah: boolean; ibu: boolean; anakLaki: boolean; anakPerempuan: boolean },
  prophetCompanion: boolean,
  childCount: number,
  childGender: "laki" | "perempuan" | "campur",
  singleChar: SingleCharType,
): { id: string; en: string } {
  const faceless = "WAJIB FACELESS — TIDAK ADA fitur wajah (mata/hidung/mulut) — wajah harus kosong/blank";
  const facelessEn = "STRICTLY FACELESS — NO facial features (no eyes, no nose, no mouth) — completely blank faces";
  if (scenePreset === "TANPA_MAKHLUK") {
    return {
      id: "TANPA makhluk bernyawa. Fokus pada: arsitektur islami (masjid/menara), pemandangan alam (awan/bintang/bulan), benda islami (Al-Quran/tasbih/lentera), atau motif geometris islami.",
      en: "No living beings. Focus on Islamic architecture, natural scenery, Islamic objects (Quran, prayer beads, lantern), or geometric Islamic art patterns.",
    };
  }
  if (scenePreset === "NABI_SAHABAT") {
    const comp = prophetCompanion ? " Di sampingnya, seorang sahabat FACELESS berjenggot dalam pakaian islami (jubah)." : "";
    const compEn = prophetCompanion ? " Beside the Prophet, a single FACELESS bearded male companion in traditional Islamic garb (jubah, turban)." : "";
    return {
      id: `Representasikan Nabi sebagai SILUET BERCAHAYA saja — dikelilingi nur/cahaya emas lembut yang memancar. DILARANG KERAS: fitur wajah, detail tubuh, bentuk manusia realistis. Hanya siluet jubah putih bersinar. Cahaya nur HARUS mendominasi gambar.${comp}`,
      en: `Represent the Prophet as a LUMINOUS SILHOUETTE ONLY surrounded by soft golden radiant aura (nur/light). STRICTLY FORBIDDEN: facial features, body details, realistic human form. Only a glowing white-clothed outline. The nur light must dominate.${compEn}`,
    };
  }
  if (scenePreset === "TUNGGAL") {
    const specs: Record<SingleCharType, { id: string; en: string }> = {
      ayah: { id: `Seorang ayah muslim ${faceless}, berjenggot, pakaian koko/jubah.`, en: `A single Muslim father, ${facelessEn}, with beard, Islamic clothing.` },
      ibu: { id: `Seorang ibu muslimah ${faceless}, mengenakan hijab syar'i panjang.`, en: `A single Muslim mother, ${facelessEn}, wearing long modest hijab.` },
      anakLaki: { id: `Seorang anak laki-laki muslim ${faceless}, mengenakan peci/kopiah.`, en: `A single Muslim boy, ${facelessEn}, wearing kufi/peci.` },
      anakPerempuan: { id: `Seorang anak perempuan muslimah ${faceless}, mengenakan hijab.`, en: `A single Muslim girl, ${facelessEn}, wearing hijab.` },
    };
    return specs[singleChar];
  }
  if (scenePreset === "KELOMPOK_ANAK") {
    const n = Math.max(1, Math.min(4, childCount));
    const half = Math.ceil(n / 2);
    const idStr = childGender === "laki" ? `${n} anak laki-laki muslim (peci/kopiah)` : childGender === "perempuan" ? `${n} anak perempuan muslimah (hijab)` : `${half} anak laki-laki (peci) dan ${n - half} anak perempuan (hijab)`;
    const enStr = childGender === "laki" ? `${n} Muslim boys (kufi)` : childGender === "perempuan" ? `${n} Muslim girls (hijab)` : `${half} Muslim boys (kufi) and ${n - half} Muslim girls (hijab)`;
    return { id: `${idStr}, semua ${faceless}.`, en: `${enStr}, all ${facelessEn}.` };
  }
  // KELUARGA
  const parts: string[] = [];
  const partsEn: string[] = [];
  if (familyChars.ayah) { parts.push("ayah berjenggot (koko/jubah)"); partsEn.push("Muslim father with beard (Islamic clothing)"); }
  if (familyChars.ibu) { parts.push("ibu berhijab syar'i panjang"); partsEn.push("Muslim mother with long hijab"); }
  if (familyChars.anakLaki) { parts.push("anak laki-laki (peci/kopiah)"); partsEn.push("Muslim boy (kufi)"); }
  if (familyChars.anakPerempuan) { parts.push("anak perempuan (hijab)"); partsEn.push("Muslim girl (hijab)"); }
  if (parts.length === 0) { parts.push("satu figur muslim"); partsEn.push("one Muslim figure"); }
  return {
    id: `Karakter: ${parts.join(", ")}. Semua ${faceless}.`,
    en: `Characters: ${partsEn.join(", ")}. All ${facelessEn}.`,
  };
}

function generateImagePrompt(
  title: string,
  style: string,
  scenePreset: ScenePreset,
  familyChars: { ayah: boolean; ibu: boolean; anakLaki: boolean; anakPerempuan: boolean },
  prophetCompanion: boolean,
  childCount: number,
  childGender: "laki" | "perempuan" | "campur",
  singleChar: SingleCharType,
  extras: { expression: string; activity: string; setting: string; colorPalette: string },
  includeText: boolean,
  aspectRatio: AspectRatio = "16:9",
): string {
  const arOption = ASPECT_RATIO_OPTIONS.find(a => a.value === aspectRatio) || ASPECT_RATIO_OPTIONS[0];
  const arLabel = aspectRatio === "16:9" ? "Widescreen 16:9" : aspectRatio === "1:1" ? "Square 1:1 (1080×1080)" : "Portrait 4:5 (1080×1350)";
  const charSpec = buildCharacterSpec(scenePreset, familyChars, prophetCompanion, childCount, childGender, singleChar);
  const hasLiving = scenePreset !== "TANPA_MAKHLUK";
  let prompt = `Tolong buatkan gambar (image generation) untuk thumbnail konten edukasi anak Islami.\n\nKonteks Judul: "${title}"\n\nSpesifikasi Wajib:\n- Gaya Visual: ${style}\n- Nuansa: Ramah anak, warna-warni ceria, pencahayaan hangat (warm lighting)\n- Aspek Rasio: ${arLabel} (Sangat Penting!)\n- Resolusi Target: ${arOption.size}\n- ${charSpec.id}`;
  if (hasLiving && scenePreset !== "NABI_SAHABAT" && extras.expression.trim()) {
    prompt += `\n- Ekspresi/Suasana Hati: ${extras.expression.trim()} (gambarkan lewat bahasa tubuh & postur — BUKAN wajah).`;
  }
  if (extras.activity.trim()) prompt += `\n- Aktivitas: ${extras.activity.trim()}.`;
  if (extras.setting.trim()) prompt += `\n- Latar/Setting: ${extras.setting.trim()}.`;
  if (extras.colorPalette.trim()) prompt += `\n- Palet Warna Dominan: ${extras.colorPalette.trim()}.`;
  if (includeText) {
    prompt += `\n- Tipografi: Tambahkan teks "${title}" dengan font tebal, mudah dibaca. PASTIKAN EJAAN BENAR 100%.`;
  } else {
    prompt += `\n- ATURAN KETAT: TIDAK BOLEH ADA TEKS, HURUF, ATAU TULISAN APAPUN. Sediakan Negative Space untuk penambahan teks manual.`;
  }
  if (aspectRatio !== "16:9") {
    prompt += `\n\n⚠️ PENTING — ASPEK RASIO ${arLabel}:\nKomposisi gambar HARUS sesuai ${aspectRatio}. ${aspectRatio === "1:1" ? "Gambar harus persegi sempurna — tidak boleh landscape." : "Gambar harus portrait/tegak — tidak boleh landscape."}\nPastikan elemen visual terpusat dan seimbang untuk format ${aspectRatio}.`;
  }
  const engActivity = extras.activity.trim() ? `, performing: ${extras.activity.trim()}` : "";
  const engSetting = extras.setting.trim() ? `, set in: ${extras.setting.trim()}` : "";
  const engColors = extras.colorPalette.trim() ? `, dominant colors: ${extras.colorPalette.trim()}` : "";
  prompt += `\n\n(English reference for AI engine):\n"Islamic kids education thumbnail: ${title}. Style: ${style}. ${charSpec.en}${engActivity}${engSetting}${engColors}. Warm lighting, vibrant child-friendly colors. Resolution: ${arOption.size}. ${includeText ? `Include text "${title}"` : "NO TEXT, NO LETTERS, negative space for manual text."} ${arOption.arFlag}"`;
  return prompt;
}

export default function PromptGeneratorPage() {
  const [mode, setMode] = useState<"CONTENT" | "IMAGE">("CONTENT");
  const [type, setType] = useState<ContentType>("QNA");
  const [title, setTitle] = useState("");
  const [kisahSubType, setKisahSubType] = useState<KisahSubType>("SIRAH");
  const [ages, setAges] = useState<string[]>(["5-7"]);
  const [options, setOptions] = useState({
    dalil: true,
    analogi: true,
    dialog: true,
    tips: true,
    perbedaanPendapat: false,
    referensi: true,
  });

  const [imageStyle, setImageStyle] = useState<string>("Animasi 3D (Pixar/Disney)");
  const [scenePreset, setScenePreset] = useState<ScenePreset>("KELUARGA");
  const [familyChars, setFamilyChars] = useState({ ayah: true, ibu: true, anakLaki: false, anakPerempuan: false });
  const [prophetCompanion, setProphetCompanion] = useState(false);
  const [childCount, setChildCount] = useState(2);
  const [childGender, setChildGender] = useState<"laki" | "perempuan" | "campur">("campur");
  const [singleChar, setSingleChar] = useState<SingleCharType>("anakLaki");
  const [includeText, setIncludeText] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [imageExtras, setImageExtras] = useState({ expression: "", activity: "", setting: "", colorPalette: "" });

  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ title: string; type: ContentType; prompt: string; date: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Intellectual Persona states
  const [selectedThinkers, setSelectedThinkers] = useState<string[]>([]);
  const [openModes, setOpenModes] = useState<string[]>([]);
  // POV for ARTIKEL type
  const [artikelPov, setArtikelPov] = useState<string>("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // Reset artikelPov when type changes away from ARTIKEL
  useEffect(() => { if (type !== "ARTIKEL") setArtikelPov(""); }, [type]);

  const handleGenerate = () => {
    if (!title.trim()) return toast.error("Judul/topik wajib diisi");
    let prompt = "";
    let historyType: ContentType = type;
    if (mode === "CONTENT") {
      prompt = generatePrompt(type, title.trim(), ages, options, kisahSubType, selectedThinkers, artikelPov);
    } else {
      prompt = generateImagePrompt(title.trim(), imageStyle, scenePreset, familyChars, prophetCompanion, childCount, childGender, singleChar, imageExtras, includeText, aspectRatio);
      historyType = "IMAGE_PROMPT";
    }
    setGeneratedPrompt(prompt);
    const entry = { title: title.trim(), type: historyType, prompt, date: new Date().toISOString() };
    const updated = [entry, ...history.filter(h => h.title !== title.trim() || h.type !== historyType)].slice(0, MAX_HISTORY);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    toast.success("Prompt berhasil di-generate!");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Prompt disalin ke clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const loadHistory = (h: typeof history[0]) => {
    setTitle(h.title);
    if (h.type === "IMAGE_PROMPT") {
      setMode("IMAGE");
    } else {
      setMode("CONTENT");
      setType(h.type);
    }
    setGeneratedPrompt(h.prompt);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
    toast.success("History dibersihkan");
  };

  const toggleAge = (age: string) => {
    if (age === "Semua Usia") {
      setAges(ages.includes(age) ? [] : ["Semua Usia"]);
    } else {
      const without = ages.filter(a => a !== "Semua Usia");
      setAges(without.includes(age) ? without.filter(a => a !== age) : [...without, age]);
    }
  };

  const typeConfigs: { value: ContentType; label: string; icon: string; desc: string }[] = [
    { value: "QNA", label: "Tanya Jawab", icon: "🗨️", desc: "Dialog anak + orang tua, jawaban instan" },
    { value: "PEMBELAJARAN", label: "Pembelajaran", icon: "📚", desc: "Narasi + dalil + analogi" },
    { value: "ARTIKEL", label: "Artikel", icon: "📝", desc: "Prosa + dalil + analogi" },
    { value: "KISAH", label: "Kisah", icon: "📖", desc: "Sirah, Teladan, atau Cerita Fiksi" },
  ];

  const imageStyles = [
    { value: "Animasi 3D (Pixar/Disney)", label: "Animasi 3D", icon: "🪄", desc: "Karakter 3D lucu" },
    { value: "Ilustrasi Vektor 2D", label: "Vektor Flat", icon: "🎨", desc: "Desain 2D kekinian" },
    { value: "Buku Cerita Anak (Watercolor)", label: "Watercolor", icon: "🖌️", desc: "Lembut & klasik" },
    { value: "Fotografi Realistis", label: "Realistis", icon: "📸", desc: "Nyata & tajam" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Wand2 className="h-6 w-6 text-purple-600" /> Prompt Generator</h1>
          <p className="text-slate-500 mt-1">Buat prompt AI yang sesuai format editor & koridor Al-Quran dan Sunnah.</p>
        </div>
        <div className="flex bg-slate-200/50 p-1 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => { setMode("CONTENT"); setGeneratedPrompt(""); }} 
            className={`flex-1 md:px-6 py-2 text-sm font-bold rounded-lg transition-all ${mode === "CONTENT" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            📝 Teks Konten
          </button>
          <button 
            onClick={() => { setMode("IMAGE"); setGeneratedPrompt(""); }} 
            className={`flex-1 md:px-6 py-2 text-sm font-bold rounded-lg transition-all ${mode === "IMAGE" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            🖼️ Thumbnail
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          {mode === "CONTENT" ? (
            <>
              {/* Tipe Konten */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3">1. Pilih Tujuan Konten</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {typeConfigs.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${type === t.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-bold text-sm text-slate-800 mt-1">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
              </div>

              {/* KISAH Sub-Type Selector — only shown when KISAH is selected */}
              {type === "KISAH" && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                  <label className="block text-sm font-bold text-amber-800 mb-3">1b. Pilih Sub-Tipe Kisah</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { value: "SIRAH" as KisahSubType, label: "Sirah Nabawiyah", icon: "👑", desc: "Khusus Nabi Muhammad ﻿" },
                      { value: "QASHASH" as KisahSubType, label: "Qashashul Anbiya'", icon: "📜", desc: "Kisah para nabi dari Al-Quran" },
                      { value: "TELADAN" as KisahSubType, label: "Teladan Sahabat & Ulama", icon: "⭐", desc: "Kisah sahabat & ulama terdahulu" },
                      { value: "CERITA_FIKSI" as KisahSubType, label: "Cerita Fiksi Islami", icon: "🌙", desc: "Cerita fiksi islami modern" },
                    ].map(st => (
                      <button key={st.value} onClick={() => setKisahSubType(st.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${kisahSubType === st.value ? "border-amber-500 bg-amber-100 shadow-sm" : "border-amber-200 hover:border-amber-300 bg-white"}`}>
                        <span className="text-2xl">{st.icon}</span>
                        <p className="font-bold text-sm text-slate-800 mt-1">{st.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{st.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Judul */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Judul / Topik Konten</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === "KISAH" ? `Contoh: ${kisahSubType === "SIRAH" ? "Kisah Perjalanan Isra' Mi'raj Nabi Muhammad ﻿" : kisahSubType === "QASHASH" ? "Kisah Nabi Yusuf dan Saudaranya" : kisahSubType === "TELADAN" ? "Kedermawanan Utsman bin Affan" : "Hana dan Hari Pertama di Sekolah"}` : "Contoh: Mengapa Kita Harus Sholat 5 Waktu?"} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-purple-500" />
              </div>

              {/* Usia — KISAH selalu 3-10, tipe lain pilih manual */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">3. Target Usia</label>
            {type === "KISAH" ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-sm font-bold">
                  📖 Kisah Islami — Semua Usia (3–10 Tahun)
                </span>
                <p className="text-xs text-slate-400">Konten kisah dirancang universal untuk seluruh rentang usia anak 3–10 tahun.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {["3-5", "5-7", "7-10", "10-13", "Semua Usia"].map(age => (
                  <label key={age} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm font-bold transition-all ${ages.includes(age) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={ages.includes(age)} onChange={() => toggleAge(age)} className="w-4 h-4 text-purple-600 rounded" />
                    {age === "Semua Usia" ? age : `${age} Tahun`}
                  </label>
                ))}
              </div>
            )}
              </div>

              {/* Opsi — conditional per type */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3">4. Opsi Tambahan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {type === "KISAH" ? (
                <>
                  {(kisahSubType === "SIRAH" || kisahSubType === "QASHASH" || kisahSubType === "TELADAN") && (
                    <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${options.referensi ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                      <input type="checkbox" checked={options.referensi} onChange={e => setOptions({ ...options, referensi: e.target.checked })} className="w-4 h-4 text-amber-600 rounded" />
                      📚 Sertakan Referensi Kitab Sumber
                    </label>
                  )}
                  <label className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${options.analogi ? "border-purple-200 bg-purple-50 text-purple-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={options.analogi} onChange={e => setOptions({ ...options, analogi: e.target.checked })} className="w-4 h-4 text-purple-600 rounded" />
                    🧩 Sertakan Analogi/Perumpamaan
                  </label>
                  {kisahSubType === "CERITA_FIKSI" && (
                    <p className="col-span-2 text-xs text-slate-400 italic p-2">Cerita Fiksi tidak menggunakan sumber dalil atau kitab.</p>
                  )}
                </>
              ) : (
                <>
                  {[
                    { key: "dalil", label: "📖 Sertakan Dalil Al-Quran & Hadits", always: true },
                    { key: "analogi", label: "🧩 Sertakan Analogi Anak-anak", always: true },
                    { key: "dialog", label: "💬 Sertakan Simulasi Dialog", always: false, onlyFor: "QNA" as ContentType },
                    { key: "tips", label: "ℹ️ Sertakan Tips Orang Tua", always: true },
                    { key: "perbedaanPendapat", label: "⚖️ Sampaikan Perbedaan Pendapat Ulama", always: true },
                  ].map(opt => {
                    if (!opt.always && opt.onlyFor && type !== opt.onlyFor) return null;
                    return (
                      <label key={opt.key} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${(options as any)[opt.key] ? "border-purple-200 bg-purple-50 text-purple-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                        <input type="checkbox" checked={(options as any)[opt.key]} onChange={e => setOptions({ ...options, [opt.key]: e.target.checked })} className="w-4 h-4 text-purple-600 rounded" />
                        {opt.label}
                      </label>
                    );
                  })}
                </>
              )}
            </div>
              </div>

              {/* ══ POV Artikel ══ tampil hanya untuk ARTIKEL */}
              {type === "ARTIKEL" && (
                <div className="bg-teal-50 p-5 rounded-2xl border border-teal-200 shadow-sm">
                  <label className="block text-sm font-bold text-teal-800 mb-3">4b. Sudut Pandang Artikel (POV)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "", label: "Semua Pembaca", icon: "👥", desc: "Universal, semua kalangan" },
                      { value: "ORTU", label: "Orang Tua", icon: "👨‍👩‍👧", desc: "Tips parenting & mendidik" },
                      { value: "ANAK", label: "Anak", icon: "👦", desc: "Untuk & dari perspektif anak" },
                    ].map(opt => (
                      <button key={opt.value} type="button" onClick={() => setArtikelPov(opt.value)}
                        className={`p-3 rounded-xl text-left border-2 transition-all ${artikelPov === opt.value ? "border-teal-500 bg-teal-100 shadow-sm" : "border-teal-200 hover:border-teal-300 bg-white"}`}>
                        <span className="text-xl">{opt.icon}</span>
                        <p className="font-bold text-sm text-slate-800 mt-1">{opt.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                  {artikelPov && (
                    <p className="text-xs text-teal-700 mt-3 font-medium">
                      {artikelPov === "ORTU" ? "✅ Prompt akan ditulis untuk Orang Tua — bahasa reflektif, actionable, fokus pada parenting." : "✅ Prompt akan ditulis dari perspektif Anak — bahasa segar, relatable, fokus karakter anak."}
                    </p>
                  )}
                </div>
              )}

              {/* ══ Intellectual Persona ══ tersedia untuk semua tipe CONTENT */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-700">
                    5. Mode Berpikir — Intellectual Persona
                    {selectedThinkers.length > 0 && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">{selectedThinkers.length} dipilih</span>
                    )}
                  </label>
                  {selectedThinkers.length > 0 && (
                    <button onClick={() => setSelectedThinkers([])} className="text-xs text-slate-400 hover:text-rose-500 transition-colors">Reset</button>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-4">Pilih tokoh untuk menyuntikkan STRUKTUR BERPIKIR mereka ke dalam prompt. Bukan gaya bahasa — melainkan cara bernalar. Bisa pilih lebih dari 1.</p>
                <div className="space-y-3">
                  {THINKING_MODES.map(modeItem => {
                    const selectedInMode = modeItem.thinkers.filter(t => selectedThinkers.includes(t.id)).length;
                    const isOpen = openModes.includes(modeItem.id);
                    return (
                      <div key={modeItem.id} className={`rounded-xl border-2 overflow-hidden transition-all ${isOpen ? `${modeItem.colorBorder} ${modeItem.colorBg}` : "border-slate-200"}`}>
                        <button type="button"
                          onClick={() => setOpenModes(prev => prev.includes(modeItem.id) ? prev.filter(m => m !== modeItem.id) : [...prev, modeItem.id])}
                          className={`w-full flex items-center justify-between px-4 py-3 ${isOpen ? modeItem.colorBg : "bg-slate-50 hover:bg-slate-100"} transition-all`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{modeItem.emoji}</span>
                            <span className={`text-sm font-bold ${isOpen ? modeItem.colorText : "text-slate-700"}`}>{modeItem.label}</span>
                            {selectedInMode > 0 && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-white ${modeItem.colorText}`}>{selectedInMode}/{modeItem.thinkers.length}</span>
                            )}
                          </div>
                          {isOpen ? <ChevronUp size={16} className={modeItem.colorText} /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-2 space-y-2">
                            {modeItem.thinkers.map(thinker => {
                              const isSelected = selectedThinkers.includes(thinker.id);
                              return (
                                <label key={thinker.id}
                                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? `${modeItem.colorBorder} bg-white shadow-sm` : "border-transparent hover:border-slate-200 hover:bg-white/50"}`}>
                                  <input type="checkbox" checked={isSelected}
                                    onChange={() => setSelectedThinkers(prev => prev.includes(thinker.id) ? prev.filter(id => id !== thinker.id) : [...prev, thinker.id])}
                                    className={`w-4 h-4 mt-0.5 ${modeItem.colorCheck} rounded flex-shrink-0`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-sm font-bold ${isSelected ? modeItem.colorText : "text-slate-800"}`}>{thinker.name}</span>
                                      <span title={thinker.recommendLabel} className="text-[12px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium cursor-help">{thinker.recommend}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{thinker.desc}</p>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedThinkers.length > 0 && (
                  <div className="mt-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <p className="text-xs text-purple-700 font-medium">🧠 Framework dari {selectedThinkers.length} tokoh akan diinjeksikan ke dalam prompt sebagai instruksi reasoning AI.</p>
                    {type === "KISAH" && <p className="text-xs text-amber-600 mt-1">⚠️ Untuk Kisah: hanya berlaku pada narasi, analogi & hikmah — tidak pada fakta sejarah.</p>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Gaya Visual */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">1. Pilih Gaya Visual</label>
                <div className="grid grid-cols-2 gap-3">
                  {imageStyles.map(t => (
                    <button key={t.value} onClick={() => setImageStyle(t.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${imageStyle === t.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="text-2xl">{t.icon}</span>
                      <p className="font-bold text-sm text-slate-800 mt-1">{t.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">1b. Aspek Rasio Gambar</label>
                <div className="grid grid-cols-3 gap-3">
                  {ASPECT_RATIO_OPTIONS.map(ar => (
                    <button key={ar.value} onClick={() => setAspectRatio(ar.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${aspectRatio === ar.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="text-2xl">{ar.icon}</span>
                      <p className="font-bold text-sm text-slate-800 mt-1">{ar.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ar.desc}</p>
                      <p className="text-[10px] text-purple-600 font-bold mt-1">{ar.size} · {ar.value}</p>
                    </button>
                  ))}
                </div>
                {aspectRatio !== "16:9" && (
                  <p className="text-xs text-purple-700 mt-3 font-medium bg-purple-50 p-2 rounded-lg">
                    📱 Prompt akan dioptimalkan untuk format {aspectRatio === "1:1" ? "persegi (Instagram Feed / Facebook Post)" : "portrait 4:5 (Instagram Post engagement terbaik)"}.
                  </p>
                )}
              </div>

              {/* Judul */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Konteks Judul/Topik</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Kisah Nabi Ibrahim, Mengapa Kita Sholat, dll." className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-purple-500" />
                <p className="text-xs text-slate-400 mt-2">AI akan menggambar elemen yang relevan dengan topik ini.</p>
              </div>

              {/* Scene Preset */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">3. Pilih Preset Adegan</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([
                    { value: "KELUARGA", icon: "👨‍👩‍👧", label: "Keluarga", desc: "Pilih karakter keluarga" },
                    { value: "NABI_SAHABAT", icon: "🌟", label: "Nabi & Sahabat", desc: "Siluet nur + sahabat" },
                    { value: "KELOMPOK_ANAK", icon: "👦", label: "Kelompok Anak", desc: "1-4 anak muslim" },
                    { value: "TUNGGAL", icon: "👤", label: "Karakter Tunggal", desc: "Satu figur saja" },
                    { value: "TANPA_MAKHLUK", icon: "🌿", label: "Tanpa Makhluk", desc: "Objek & lingkungan" },
                  ] as {value: ScenePreset; icon: string; label: string; desc: string}[]).map(sp => (
                    <button key={sp.value} onClick={() => setScenePreset(sp.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${scenePreset === sp.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="text-2xl">{sp.icon}</span>
                      <p className="font-bold text-sm text-slate-800 mt-1">{sp.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{sp.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Conditional sub-options */}
                <div className="mt-4">
                  {scenePreset === "NABI_SAHABAT" && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                      <p className="text-xs font-bold text-amber-800 flex items-center gap-1">⚠️ Representasi Nabi</p>
                      <p className="text-xs text-amber-700">Nabi digambarkan sebagai SILUET BERCAHAYA (nur) saja — tanpa fitur wajah atau detail fisik. Periksa hasil gambar sebelum digunakan.</p>
                      <label className="flex items-center gap-2 text-sm font-medium text-amber-800 cursor-pointer">
                        <input type="checkbox" checked={prophetCompanion} onChange={e => setProphetCompanion(e.target.checked)} className="w-4 h-4 text-amber-600 rounded" />
                        Tambahkan sahabat (faceless) di sampingnya
                      </label>
                    </div>
                  )}
                  {scenePreset === "KELUARGA" && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-600 mb-2">Pilih anggota keluarga yang ditampilkan:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([["ayah","👨 Ayah"],["ibu","👩 Ibu"],["anakLaki","👦 Anak Laki-laki"],["anakPerempuan","👧 Anak Perempuan"]] as [keyof typeof familyChars, string][]).map(([key, label]) => (
                          <label key={key} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm font-medium transition-all ${familyChars[key] ? "border-purple-300 bg-purple-50 text-purple-800" : "border-slate-200 text-slate-500"}`}>
                            <input type="checkbox" checked={familyChars[key]} onChange={e => setFamilyChars({...familyChars, [key]: e.target.checked})} className="w-4 h-4 rounded text-purple-600" />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {scenePreset === "KELOMPOK_ANAK" && (
                    <div className="mt-3 flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-600 mb-1">Jumlah anak: <span className="text-purple-600">{childCount}</span></p>
                        <input type="range" min={1} max={4} value={childCount} onChange={e => setChildCount(parseInt(e.target.value))} className="w-full accent-purple-500" />
                      </div>
                      <div className="flex gap-2">
                        {([["laki","Laki-laki"],["perempuan","Perempuan"],["campur","Campuran"]] as ["laki"|"perempuan"|"campur", string][]).map(([val, label]) => (
                          <button key={val} onClick={() => setChildGender(val)} className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${childGender === val ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500"}`}>{label}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {scenePreset === "TUNGGAL" && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {([["ayah","👨 Ayah"],["ibu","👩 Ibu"],["anakLaki","👦 Anak Laki"],["anakPerempuan","👧 Anak Perempuan"]] as [SingleCharType, string][]).map(([val, label]) => (
                        <button key={val} onClick={() => setSingleChar(val)} className={`py-2 text-xs font-bold rounded-lg border transition-all ${singleChar === val ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500"}`}>{label}</button>
                      ))}
                    </div>
                  )}
                  {scenePreset === "TANPA_MAKHLUK" && (
                    <p className="mt-3 text-xs text-slate-500 italic">Gambar akan menampilkan arsitektur islami, pemandangan alam, benda islami, atau motif geometris.</p>
                  )}
                </div>
              </div>

              {/* Include text + extras */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">4. Konteks Tambahan <span className="text-xs font-normal text-slate-400">(opsional)</span></label>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${includeText ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600"}`}>
                    <input type="checkbox" checked={includeText} onChange={e => setIncludeText(e.target.checked)} className="w-4 h-4 mt-0.5 text-amber-600 rounded" />
                    <div>
                      <p className="font-bold">Sertakan Teks Judul di Gambar</p>
                      <p className="text-xs mt-0.5 opacity-80">Catatan: AI sering salah ejaan. Direkomendasikan OFF jika ingin tambah teks manual via Canva.</p>
                    </div>
                  </label>
                  {scenePreset !== "TANPA_MAKHLUK" && scenePreset !== "NABI_SAHABAT" && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">😊 Ekspresi / Suasana Hati</label>
                      <input type="text" value={imageExtras.expression} onChange={e => setImageExtras({...imageExtras, expression: e.target.value})} placeholder="misal: Bahagia & khusyuk, Penasaran, Semangat" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400" />
                      <p className="text-[11px] text-slate-400 mt-1">Ekspresi digambarkan lewat bahasa tubuh & postur — bukan wajah.</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">⚡ Aktivitas / Tindakan</label>
                    <input type="text" value={imageExtras.activity} onChange={e => setImageExtras({...imageExtras, activity: e.target.value})} placeholder="misal: Sholat berjamaah, Membaca Al-Quran bersama, Sedekah" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">🏡 Latar / Setting</label>
                    <input type="text" value={imageExtras.setting} onChange={e => setImageExtras({...imageExtras, setting: e.target.value})} placeholder="misal: Masjid, Ruang keluarga, Taman islami, Padang pasir" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">🎨 Palet Warna Dominan</label>
                    <input type="text" value={imageExtras.colorPalette} onChange={e => setImageExtras({...imageExtras, colorPalette: e.target.value})} placeholder="misal: Hijau & Emas, Biru Langit & Putih, Netral Hangat" className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400" />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Generate Button */}
          <button onClick={handleGenerate} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2">
            <Wand2 size={18} /> Generate Prompt
          </button>

          {/* Result */}
          {generatedPrompt && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-5 py-3 flex items-center justify-between">
                <span className="text-white font-bold text-sm">Prompt yang Dihasilkan</span>
                <div className="flex gap-2">
                  <button onClick={handleCopy} className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all">
                    {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Tersalin!" : "Salin"}
                  </button>
                  <Link href="/admin/editor" className="flex items-center gap-1 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-bold transition-all">
                    <PenLine size={14} /> Buka Editor
                  </Link>
                </div>
              </div>
              <pre className="p-5 text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] overflow-y-auto bg-slate-50">{generatedPrompt}</pre>
            </div>
          )}
        </div>

        {/* Sidebar: History */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Clock size={16} className="text-purple-500" /> History ({history.length})
                {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-xs text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
              )}
            </div>
            {showHistory && (
              <div className="space-y-2">
                {history.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Belum ada history</p>}
                {history.map((h, i) => (
                  <button key={i} onClick={() => loadHistory(h)} className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-purple-50 border border-slate-100 hover:border-purple-200 transition-all">
                    <p className="font-bold text-xs text-slate-800 line-clamp-1">{h.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-bold">{h.type}</span>
                      <span className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString("id-ID")}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Guide */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-5 rounded-2xl border border-purple-100">
            <h3 className="font-bold text-purple-800 text-sm mb-2">📋 Cara Pakai ({mode === "CONTENT" ? "Teks" : "Thumbnail"})</h3>
            {mode === "CONTENT" ? (
              <ol className="text-xs text-purple-700 space-y-1.5 list-decimal list-inside">
                <li>Pilih tujuan konten</li>
                <li>Isi judul/topik</li>
                <li>Pilih usia target</li>
                <li>Centang opsi yang diinginkan</li>
                <li>Klik <strong>Generate Prompt</strong></li>
                <li>Klik <strong>Salin</strong> → paste ke ChatGPT/Gemini</li>
                <li>Copy output AI → paste ke <strong>Tulis Konten</strong> di Editor</li>
              </ol>
            ) : (
              <ol className="text-xs text-purple-700 space-y-1.5 list-decimal list-inside">
                <li>Pilih gaya visual gambar</li>
                <li>Isi judul/topik artikel untuk konteks</li>
                <li>Pilih aturan gambar (misal tanpa makhluk bernyawa)</li>
                <li>Klik <strong>Generate Prompt</strong></li>
                <li>Klik <strong>Salin</strong> → paste ke DALL-E 3, Midjourney, atau Bing</li>
                <li>Download hasil gambarnya</li>
                <li>Upload ke bagian <strong>Thumbnail</strong> di Editor</li>
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
