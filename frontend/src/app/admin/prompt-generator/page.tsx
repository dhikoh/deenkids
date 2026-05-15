"use client";

import { useState, useEffect } from "react";
import { Wand2, Copy, Check, PenLine, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import Cookies from "js-cookie";
import { fetchEditorNodes } from "@/lib/api";

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
   Contoh: "Wahai Ibrahim, apakah kamu percaya?" (Hadits Riwayat Bukhari Nomor 1234)
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
   Cantumkan sumbernya. Contoh: "Ya Tuhanku, tunjukkanlah kepadaku..." (Quran Surah Al-Baqarah ayat 260)
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

  prompt += `━━━ 📝 BLOK 1: ISI KONTEN (paragraph + heading) — WAJIB PANJANG & MENGALIR ━━━
Tulis kisah menggunakan ARC EMOSIONAL berikut. Setiap fase WAJIB ada dan mengalir ke fase berikutnya:

━ FASE 1 — HOOK (1 paragraf)
[PARAGRAPH] Pembuka yang LANGSUNG menarik perhatian dalam kalimat pertama.
Bisa berupa: momen menegangkan, suasana yang kuat, atau pertanyaan yang menggugah.
Contoh: "Langit masih gelap ketika sebuah keputusan mengubah segalanya..."

━ FASE 2 — SETUP (1–2 paragraf)
[PARAGRAPH] Perkenalkan tokoh, tempat, waktu, dan suasana secara hangat.
Buat pembaca PEDULI pada tokoh sebelum konflik datang.

━ FASE 3 — KONFLIK / UJIAN (2–3 paragraf)
[HEADING] [nama babak — misal: "Ujian yang Berat"]
[PARAGRAPH] Ini jantung cerita. Tunjukkan perjuangan, keraguan, dan tekanan.
${subType !== "CERITA_FIKSI" ? "Sisipkan dialog bersumber dari riwayat dalam narasi jika ada." : "Sisipkan dialog antar tokoh yang membuat cerita hidup."}
Akhiri babak ini dengan kalimat yang membuat pembaca INGIN tahu kelanjutannya.

━ FASE 4 — KLIMAKS (1–2 paragraf)
[HEADING] [nama babak — momen paling intens]
[PARAGRAPH] Keputusan besar, pertolongan Allah, atau momen yang mengubah segalanya.
Ini puncak emosi — buat pembaca merasakan getarannya.
Akhiri dengan kalimat penghubung menuju resolusi.

━ FASE 5 — RESOLUSI & KEHANGATAN (1–2 paragraf)
[PARAGRAPH] Tunjukkan buah dari kesabaran/keimanan. Tutup dengan kalimat yang terasa seperti pelukan hangat.

ATURAN TRANSISI WAJIB:
- Setiap fase HARUS mengalir ke fase berikutnya dengan kalimat penghubung.
- Urutan fase TIDAK BOLEH ditukar — jika ditukar, cerita akan rusak.
- Contoh kalimat penghubung: "Tapi ujian yang sesungguhnya belum selesai...", "Justru di saat itulah, sesuatu yang tak terduga terjadi..."
\n\n`;

  if (options.analogi) {
    const bloknr = "2";
    prompt += `━━━ 🧩 BLOK ${bloknr}: ANALOGI ORGANIK (analogy) ━━━
Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam kisah di atas — bukan analogi generik.

ATURAN:
1. Baca ulang kisah yang sudah kamu tulis → ambil benda/situasi/tokoh yang sudah muncul → jadikan analogi.
2. Analogi harus membuat anak bilang "Ohhh iya ya!"
3. JANGAN buat analogi yang tidak ada hubungannya dengan elemen dalam cerita.

❌ SALAH: Kisah tentang sabar menunggu pelangi → Analogi "menanam permen di tanah"
   (permen tidak muncul dalam cerita — analoginya terasa random)
✅ BENAR: Kisah tentang sabar menunggu pelangi → Analogi menggunakan pelangi/hujan yang SUDAH ada dalam cerita.

TEST MANDIRI: Jika analogimu bisa dipakai untuk topik LAIN tanpa perubahan, berarti terlalu generik. Buat ulang.

Format:
• Judul: [ambil dari elemen yang sudah muncul dalam kisah]
• Penjelasan: [2–3 kalimat, menggunakan benda/situasi dari kisah itu sendiri]\n\n`;
  }

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
• Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
• Sumber URL: [URL sumber]
  - Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat]
  - Hadits: https://www.hadits.id/hadits/[kitab]/[nomor]
  - 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field ini.\n`;
  } else {
    prompt += `\n━━━ 🤲 BLOK DOA (doa) — Opsional ━━━
Boleh menyisipkan doa sederhana dalam narasi cerita.
Jika ingin mencantumkan doa spesifik dengan sumber, WAJIB dari Al-Quran/Hadits Shahih saja.
Format (jika digunakan):
• Judul : [nama doa singkat]
• Arab  : [teks arab doa]
• Terjemah: [terjemahan]
• Sumber: [sumber shahih]
• Sumber URL: [URL jika tersedia — JANGAN mengarang URL]\n`;
  }

  const tipBlockNr = options.analogi ? "3" : "2";
  prompt += `━━━ ℹ️ BLOK ${tipBlockNr}: CATATAN / TIPS (tip) ━━━
Tips WAJIB merupakan REFLEKSI NATURAL dari momen spesifik yang terjadi dalam kisah di atas.
Setiap tips harus bisa dijawab: "Di bagian mana kisah ini poin ini muncul?"

❌ SALAH: Tips generik yang bisa ditulis tanpa membaca kisah sama sekali.
✅ BENAR: Tips yang hanya masuk akal setelah membaca kisah di atas.

Tulis 3–4 poin, hangat dan memotivasi — BUKAN ceramah.
Format per poin:
• 💡 [poin hikmah + referensi ke momen kisah]
   Contoh: "Seperti [tokoh] yang [momen dari kisah], ajak anak..."\n\n`;

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
✅ Gunakan sapaan langsung ke anak di mukadimah: "Teman-teman...", "Adik-adik..."
✅ Nilai Islam terasa ALAMI dalam cerita — tidak dipaksakan
✅ Akhiri dengan kehangatan, rasa syukur, atau motivasi yang menyentuh
❌ JANGAN terlalu singkat — ini bukan ringkasan, ini KISAH LENGKAP
❌ JANGAN menggurui atau berceramah langsung kepada pembaca`;

  if (subType !== "CERITA_FIKSI") {
    const dalilBlockNr = options.analogi ? "4" : "3";
    prompt += `━━━ 📖 BLOK ${dalilBlockNr}: DALIL / LANDASAN (dalil) ━━━
Cantumkan 1–2 ayat Al-Quran atau Hadits Shahih yang paling relevan dengan tema kisah.
Format per dalil:
• Arabic  : [teks arab]
• Terjemah: [terjemahan bahasa Indonesia]
• Sumber  : [nama surah + ayat, atau kitab hadits + nomor]
• Sumber URL: [URL sumber — panduan di bawah]

⚠️ PANDUAN URL SUMBER:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat] | Contoh: Quran Surah Al-Baqarah ayat 260 → https://quran.com/2/260
- Hadits: https://www.hadits.id/hadits/[kitab]/[nomor] | Contoh: Hadits Riwayat Bukhari Nomor 1234 → https://www.hadits.id/hadits/bukhari/1234
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".
Tempatkan di posisi paling bermakna (sebelum klimaks atau setelah narasi utama).\n\n`;
  }

  // Inject intellectual framework if thinkers selected
  const framework = generateIntellectualFramework(selectedThinkers, true);
  if (framework) prompt += framework;

  prompt += `\n\n━━━ 🕌 PEMBUKAAN / MUKADIMAH (opening) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini harus di-copy ke field "Pembukaan (Mukadimah)" yang ada di Editor — BUKAN ditempel di blok konten isi.

Tulis salam pembuka yang hangat dan relevan dengan tema kisah.
- Awali dengan "Assalamualaikum warahmatullahi wabarakatuh"
- Lanjutkan dengan 1-2 kalimat pengantar singkat yang mengaitkan pembaca/pendengar dengan kisah yang akan diceritakan.
- Sapa anak langsung: "Teman-teman...", "Adik-adik..."
- Nada: ramah, mengundang, dan membangkitkan rasa ingin tahu.

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini harus di-copy ke field "Penutupan" yang ada di Editor — BUKAN ditempel di blok konten isi.

Tulis penutup yang menyentuh dan menginspirasi.
- Rangkum pelajaran utama dalam 1-2 kalimat.
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"\n`;

  // === FORMAT OUTPUT INSTRUCTIONS (wajib untuk parser Import Konten AI) ===
  prompt += `\n\n════════════════════════════════════════
⚠️  INSTRUKSI FORMAT OUTPUT — WAJIB DIIKUTI
════════════════════════════════════════
Output kamu akan dibaca oleh SISTEM OTOMATIS dan disimpan sebagai file .txt.
Ikuti aturan berikut dengan TEPAT atau konten tidak akan tersimpan dengan benar.

1. JANGAN gunakan markdown: **, __, ##, ---, ~~
2. Tulis metadata di BARIS PALING ATAS:
   Judul: [judul kisah]
   Deskripsi: [2-3 kalimat menggugah rasa ingin tahu]
   Usia: 3-10
   Tag: [tag1, tag2, tag3, tag4, tag5]

3. Setiap blok konten WAJIB diawali marker di baris TERSENDIRI:
   (opening)   → teks pembukaan / mukadimah
   (paragraph) → isi kisah / narasi utama
   (heading)   → judul babak / fase cerita (gunakan untuk FASE 3, 4)
   (dalil)     → dalil Al-Quran atau Hadits (WAJIB: Arab, Terjemahan, Sumber, Sumber URL)
   (analogy)   → analogi organik dari kisah
   (tip)       → catatan / tips untuk orang tua
   (hikmah)    → hikmah / pelajaran
   (doa)       → doa (WAJIB: Arab, Terjemahan, Sumber, Sumber URL)
   (closing)   → teks penutupan

4. Format WAJIB untuk blok (dalil):
   (dalil)
   Dalil 1:
   Arab: [teks arab]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah NamaSurah ayat X atau Hadits Riwayat NamaKitab Nomor X]
   Sumber URL: [https://quran.com/surah/ayat — KOSONGKAN jika tidak 100% yakin]

5. Format WAJIB untuk blok (doa):
   (doa)
   Judul: [nama doa singkat]
   Arab: [teks arab doa]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
   Sumber URL: [https://quran.com/... — KOSONGKAN jika tidak 100% yakin]

Contoh output yang BENAR:
---
Judul: Kisah Nabi Ibrahim dan Api
Deskripsi: Kisah keberanian Nabi Ibrahim yang tidak terbakar api.
Usia: 3-10
Tag: nabi ibrahim, sabar, tawakal, api, mukjizat

(opening)
Assalamualaikum warahmatullahi wabarakatuh, teman-teman!

(paragraph)
Langit masih gelap ketika sebuah keputusan mengubah segalanya...

(heading)
Ujian yang Berat

(paragraph)
Nabi Ibrahim berdiri tegak di hadapan api yang menyala-nyala...

(analogy)
Judul: Api yang Tidak Membakar
Penjelasan: Bayangkan api unggun yang biasanya panas...

(tip)
Poin 1: Ajak anak berdiskusi tentang keberanian...

(hikmah)
Hikmah: Dari kisah ini kita belajar bahwa...

(closing)
Wallahu a'lam bishawab. Wassalamualaikum warahmatullahi wabarakatuh.
---
════════════════════════════════════════`;

  return prompt;
}

function generatePrompt(type: ContentType, title: string, ages: string[], options: Record<string, boolean>, kisahSubType?: KisahSubType, selectedThinkers: string[] = [], artikelPov: string = ""): string {
  if (type === "KISAH") return generateKisahPrompt(kisahSubType || "SIRAH", title, options, selectedThinkers);
  const ageLabel = ages.length ? ages.map(a => a === "Semua Usia" ? "semua usia" : `${a} tahun`).join(", ") : "semua usia";

  const typeLabel = type === "QNA" ? "Tanya Jawab" : type === "PEMBELAJARAN" ? "Pembelajaran" : "Artikel";

  // === BAGIAN 1: ROLE & KORIDOR ===
  let prompt = `Kamu adalah penulis konten islami untuk platform edukasi anak bernama Adably. Platform ini menyajikan konten parenting islami untuk anak-anak.

⚠️ PERSPEKTIF TTS (TEXT-TO-SPEECH):
Konten ini akan DIBACAKAN langsung kepada anak melalui fitur audio.
Tulis seolah-olah kamu sedang BERCERITA kepada anak — bukan menulis artikel untuk dewasa.
- Gunakan nada hangat, akrab, dan penuh semangat
- Boleh sapa anak: "Teman-teman...", "Nah, kamu tahu nggak...", "Yuk kita belajar..."
- Hindari bahasa kaku/formal yang terasa seperti buku teks
- Kalimat harus enak DIDENGAR, bukan hanya enak dibaca

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
8. KAIDAH DALIL SESUAI PEMAHAMAN SALAF:
   a. PERKARA IBADAH (shalat, puasa, zakat, haji, doa, dzikir, thaharah, dll):
      Hukum asal ibadah adalah HARAM/TERLARANG sampai ada dalil yang memerintahkan (tauqifiyyah).
      → Sumber WAJIB dari Al-Quran dan/atau Hadits Shahih saja (tuntunan langsung dari Rasulullah ﷺ).
      → JANGAN mencantumkan amalan ibadah yang tidak ada tuntunannya dari Rasulullah ﷺ.
      → Setiap amalan ibadah HARUS disertai dalil perintah/tuntunan yang jelas.
   b. PERKARA MUAMALAH (jual-beli, sosial, adat, makanan, pakaian, teknologi, dll):
      Hukum asal muamalah adalah MUBAH (boleh) sampai ada dalil yang melarang.
      → Cukup sebutkan dalil LARANGAN jika ada hal yang dilarang, bukan dalil pembolehan.
      → Jika tidak ada dalil larangan yang shahih, nyatakan bahwa hukum asalnya mubah/boleh.
      → JANGAN mengharamkan sesuatu tanpa dalil larangan yang jelas dari Al-Quran atau Hadits Shahih.

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

Platform kami menggunakan sistem "Blok Konten". Kamu HARUS memberikan output dalam format blok-blok berikut.

═══ METADATA ═══
- Judul: [judul konten yang menarik]
- Deskripsi Singkat: [1-2 kalimat ringkasan konten]
- Kelompok Usia: ${ageLabel}
- Tag: [3-5 kata kunci relevan, dipisah koma]

═══ BLOK KONTEN ═══

`;

  if (type === "QNA") {
    prompt += `URUTAN BLOK YANG DIREKOMENDASIKAN (ikuti urutan ini untuk alur terbaik):
1. 💡 JAWABAN INSTAN — langsung jawab pertanyaan anak (quick_answer)
2. 💬 DIALOG — simulasi bagaimana orangtua menjelaskan ke anak (dialog)
3. 📖 DALIL — landasan dari Al-Quran/Hadits (dalil)
4. 🧩 ANALOGI — perumpamaan dari kehidupan anak (analogy)
5. 📝 ISI KONTEN — penjelasan tambahan jika perlu detail lebih (paragraph)
6. ℹ️ TIPS — panduan praktis untuk orangtua (tip)
7. ✨ HIKMAH — refleksi penutup (hikmah)
8. 🤲 DOA — doa relevan (doa)

KUNCI ALUR: Setiap blok harus TERASA SAMBUNGAN dari blok sebelumnya.
Dialog menjelaskan jawaban instan. Dalil memperkuat dialog. Analogi menyederhanakan dalil. Tips mengaplikasikan semuanya.

`;
    prompt += `💡 BLOK: JAWABAN INSTAN (quick_answer)
Jawaban singkat dan langsung. Maksimal 2-3 kalimat yang menjawab inti pertanyaan.

💬 BLOK: SIMULASI DIALOG (dialog)
Tulis dialog seperti percakapan NYATA di rumah — bukan tanya-jawab formal.
Anak boleh menyela, menyanggah, atau bertanya lagi.
Orang tua boleh berpikir sebentar, menggunakan cerita pendek, atau bertanya balik.
Gunakan BAHASA SEHARI-HARI keluarga muslim — terasa seperti "ini bisa terjadi di rumah saya".

❌ KAKU: "Nak, tahukah kamu bahwa shalat itu wajib?"
✅ NATURAL: "Hmm, kamu pernah nggak merasa lemas kalau belum makan seharian? Nah, sholat itu makanan untuk hati kita..."

Percakapan HANYA antara Anak dengan Ibu ATAU Anak dengan Ayah.
Format:
---
DIALOG:
- [Anak] "..."
- [Ibu] "..."
- [Anak] "..."
---

`;
  } else if (type === "PEMBELAJARAN") {
    prompt += `URUTAN BLOK PEDAGOGIS (ikuti urutan ini untuk pembelajaran efektif):
1. 📝 HOOK — buka dengan pertanyaan/fakta/cerita pendek yang buat anak PENASARAN (paragraph)
2. 📝 PENJELASAN INTI — jelaskan konsep utama dengan bahasa sederhana (paragraph)
3. 📖 DALIL — tunjukkan landasannya dari Al-Quran/Hadits (dalil)
4. 🧩 ANALOGI — buat konsep lebih mudah dimengerti (analogy)
5. 📝 PRAKTIK — langkah konkret yang bisa dilakukan anak (paragraph)
6. ℹ️ TIPS — panduan untuk orang tua (tip)
7. ✨ HIKMAH — refleksi mengapa ini penting (hikmah)
8. 🤲 DOA — doa yang relevan (doa)

KUNCI: Setiap blok harus menjawab "lalu apa?" dari blok sebelumnya — sehingga terasa satu alur yang mengalir.

⚠️ PERSPEKTIF AUDIO: Konten ini akan DIBACAKAN kepada anak via TTS.
Tulis seperti guru yang sedang bercerita di kelas — bukan menulis diktat.
Sapa anak langsung: "Teman-teman...", "Coba bayangkan...", "Keren ya?"
Pastikan kalimat mengalir natural ketika didengarkan, bukan hanya enak dibaca.

📝 BLOK: ISI KONTEN (paragraph)
Gunakan bahasa yang mudah dipahami anak. Buka dengan HOOK terlebih dulu, lalu penjelasan inti, lalu langkah praktik.

`;
  } else if (type === "ARTIKEL") {
    prompt += `PANDUAN MENULIS ARTIKEL:
- Buka dengan HOOK — jangan langsung masuk materi. Mulai dengan anekdot nyata, pertanyaan, atau fakta mengejutkan.
- Gunakan contoh nyata dari kehidupan anak/keluarga.
- Setiap heading harus membuat pembaca ingin baca bagian selanjutnya.
- Tutup setiap section dengan kalimat yang menghubungkan ke section berikutnya.
- Akhiri dengan CALL TO ACTION yang hangat dan mendorong tindakan.

📝 BLOK: ISI KONTEN (paragraph)
Tulis narasi artikel yang mengalir, menginspirasi, dan terasa personal — bukan ceramah.

`;
  } else {
    prompt += `📝 BLOK: ISI KONTEN (paragraph)
Teks narasi atau penjelasan utama. Gunakan bahasa yang mudah dipahami anak.

`;
  }


  if (options.analogi) {
    prompt += `🧩 BLOK: ANALOGI KONTEKSTUAL (analogy)
Analogi HARUS relevan dengan usia target DAN lahir dari konteks konten yang sudah kamu tulis.

PANDUAN USIA:
- 3-5 tahun: mainan, hewan peliharaan, makanan favorit, teman bermain
- 5-7 tahun: sekolah, PR, jajan, sepeda, teman sekelas
- 7-10 tahun: game, olahraga, eksplorasi alam, tim/kelompok
- 10-13 tahun: media sosial, teknologi, cita-cita, tanggung jawab

ATURAN:
1. Baca ulang konten yang sudah kamu tulis → ambil elemen di dalamnya → jadikan analogi.
2. TEST MANDIRI: Jika analogi ini bisa dipakai untuk topik LAIN tanpa perubahan → terlalu generik, buat ulang.

Format:
---
ANALOGI:
Judul: "[judul yang spesifik, ambil dari elemen konten]"
Isi: "[2-3 kalimat menggunakan referensi dari konten yang sudah ditulis]"
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
Sumber: Quran Surah Thaha ayat 114
Sumber URL: https://quran.com/20/114
---

⚠️ PANDUAN URL SUMBER DOA:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat] | Contoh: Quran Surah Thaha ayat 114 → https://quran.com/20/114
- Hadits: https://www.hadits.id/hadits/[nama-kitab]/[nomor]
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".

`;


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


  if (options.dalil) {
    prompt += `📖 BLOK: DALIL/LANDASAN (dalil)
Sumber hukum Islam yang relevan. PENTING: Dalam 1 blok dalil bisa ada BANYAK sumber dalil sekaligus. Setiap dalil berisi:
- Teks Arab (jika tersedia)
- Terjemahan / isi dalil dalam Bahasa Indonesia
- Sumber yang JELAS (contoh: Quran Surah Al-Baqarah ayat 43, Hadits Riwayat Bukhari Nomor 8, Hadits Riwayat Muslim Nomor 16)

Format yang harus kamu ikuti:
---
DALIL:
Dalil 1:
  Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
  Terjemahan: "Sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman."
  Sumber: Quran Surah An-Nisa ayat 103
  Sumber URL: https://quran.com/4/103

Dalil 2:
  Arab: (jika ada)
  Terjemahan: "..."
  Sumber: Hadits Riwayat Bukhari Nomor 8
  Sumber URL: https://www.hadits.id/hadits/bukhari/8
---

⚠️ PANDUAN URL SUMBER WAJIB DIBACA:
- Al-Quran: format URL = https://quran.com/[nomor-surah]/[nomor-ayat]
  Contoh: Quran Surah An-Nisa ayat 103 → https://quran.com/4/103 | Quran Surah Al-Baqarah ayat 255 → https://quran.com/2/255
- Hadits: format URL = https://www.hadits.id/hadits/[nama-kitab]/[nomor]
  Contoh: Hadits Riwayat Bukhari Nomor 8 → https://www.hadits.id/hadits/bukhari/8
- 🛑 LARANGAN KERAS: JANGAN MENGARANG atau MENEBAK URL.
  Jika tidak 100% yakin URL-nya benar, KOSONGKAN field "Sumber URL" — cukup isi "Sumber" teks saja.

`;
  }

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

  prompt += `\n\n━━━ 🕌 PEMBUKAAN / MUKADIMAH (opening) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini harus di-copy ke field "Pembukaan (Mukadimah)" yang ada di Editor — BUKAN ditempel di blok konten isi.

Tulis salam pembuka yang hangat dan relevan dengan topik.
- Awali dengan "Assalamualaikum warahmatullahi wabarakatuh"
- Lanjutkan dengan 1-2 kalimat pengantar singkat yang sesuai tema dan usia target.
- Nada: ramah, hangat, dan membangkitkan rasa ingin tahu anak.
- Sapa anak langsung: "Teman-teman...", "Adik-adik..."

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini harus di-copy ke field "Penutupan" yang ada di Editor — BUKAN ditempel di blok konten isi.

Tulis penutup yang menginspirasi.
- Rangkum pelajaran utama dalam 1-2 kalimat.
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"\n`;

  // === FORMAT OUTPUT INSTRUCTIONS (wajib untuk parser Import Konten AI) ===
  prompt += `\n\n════════════════════════════════════════
⚠️  INSTRUKSI FORMAT OUTPUT — WAJIB DIIKUTI
════════════════════════════════════════
Output kamu akan dibaca oleh SISTEM OTOMATIS dan disimpan sebagai file .txt.
Ikuti aturan berikut dengan TEPAT atau konten tidak akan tersimpan dengan benar.

1. JANGAN gunakan markdown: **, __, ##, ---, ~~
2. Tulis metadata di BARIS PALING ATAS (sebelum blok apapun):
   Judul: [judul konten]
   Deskripsi: [1-2 kalimat ringkasan]
   Usia: [contoh: 5-7, 7-10]
   Tag: [tag1, tag2, tag3, tag4]

3. Setiap blok konten WAJIB diawali marker di baris TERSENDIRI (persis seperti ini):
   (opening)      → teks pembukaan / mukadimah
   (quick_answer) → jawaban instan [KHUSUS QNA]
   (paragraph)    → isi konten / narasi
   (dialog)       → simulasi percakapan
   (dalil)        → dalil Al-Quran atau Hadits (WAJIB: sertakan Arab, Terjemahan, Sumber, Sumber URL)
   (analogy)      → analogi kontekstual
   (tip)          → tips orang tua
   (hikmah)       → hikmah / pelajaran
   (doa)          → doa (WAJIB: sertakan Arab, Terjemahan, Sumber, Sumber URL)
   (closing)      → teks penutupan

4. Format WAJIB untuk blok (dalil) — ikuti PERSIS:
   (dalil)
   Dalil 1:
   Arab: [teks arab]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah NamaSurah ayat X atau Hadits Riwayat NamaKitab Nomor X]
   Sumber URL: [https://quran.com/surah/ayat — KOSONGKAN jika tidak 100% yakin]

5. Format WAJIB untuk blok (doa) — ikuti PERSIS:
   (doa)
   Judul: [nama doa singkat]
   Arab: [teks arab doa]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
   Sumber URL: [https://quran.com/... — KOSONGKAN jika tidak 100% yakin]

Contoh output yang BENAR:
---
Judul: Mengapa Kita Harus Sholat?
Deskripsi: Penjelasan kewajiban sholat untuk anak muslim.
Usia: 5-7, 7-10
Tag: sholat, ibadah, anak, wajib

(opening)
Assalamualaikum warahmatullahi wabarakatuh, teman-teman!

(quick_answer)
Sholat adalah kewajiban setiap muslim yang sudah baligh...

(paragraph)
Tahukah kamu, sholat itu seperti waktu spesial kita berbicara dengan Allah...

(dalil)
Dalil 1:
Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
Terjemahan: Sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya.
Sumber: Quran Surah An-Nisa ayat 103
Sumber URL: https://quran.com/4/103

(doa)
Judul: Doa Memohon Keistiqomahan
Arab: رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا
Terjemahan: Ya Tuhan kami, janganlah Engkau jadikan hati kami condong kepada kesesatan.
Sumber: Quran Surah Ali Imran ayat 8
Sumber URL: https://quran.com/3/8

(closing)
Wallahu a'lam bishawab. Wassalamualaikum warahmatullahi wabarakatuh.
---
════════════════════════════════════════`;

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
  category: string = "",
  includeCategory: boolean = true,
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
  const categoryLabel = includeCategory ? getCategoryLabel(category) : "";
  if (includeCategory && categoryLabel) {
    prompt += `\n- BRANDING (sudut KIRI ATAS gambar, disusun vertikal dari atas ke bawah):\n  Baris 1: "${categoryLabel}" — font sama seperti judul, ukuran 50% dari ukuran judul, semi-transparan (opacity 50-70%)\n  Baris 2: "Adably.id" — font sama seperti judul, ukuran 50% dari ukuran judul, semi-transparan (opacity 50-70%)\n  Baris 3: "Platform Edukasi Anak Islami" — ukuran lebih kecil dari Adably.id (sekitar 30-40% dari judul), semi-transparan\n  Warna: putih dengan shadow halus agar terbaca di semua latar belakang.`;
  } else {
    prompt += `\n- BRANDING (sudut KIRI ATAS gambar, disusun vertikal dari atas ke bawah):\n  Baris 1: "Adably.id" — font sama seperti judul, ukuran 50% dari ukuran judul, semi-transparan (opacity 50-70%)\n  Baris 2: "Platform Edukasi Anak Islami" — ukuran lebih kecil dari Adably.id (sekitar 30-40% dari judul), semi-transparan\n  Warna: putih dengan shadow halus agar terbaca di semua latar belakang.`;
  }
  const brandingEn = includeCategory && categoryLabel
    ? `Top-left corner branding: '${categoryLabel}' + 'Adably.id' + 'Platform Edukasi Anak Islami' in white semi-transparent text with subtle shadow.`
    : `Top-left corner branding: 'Adably.id' + 'Platform Edukasi Anak Islami' in white semi-transparent text with subtle shadow.`;
  prompt += `\n\n(English reference for AI engine):\n"Islamic kids education thumbnail: ${title}. Style: ${style}. ${charSpec.en}${engActivity}${engSetting}${engColors}. Warm lighting, vibrant child-friendly colors. Resolution: ${arOption.size}. ${includeText ? `Include text "${title}"` : "NO TEXT, NO LETTERS, negative space for manual text."} ${brandingEn} ${arOption.arFlag}"`;
  return prompt;
}


// Map category enum to Indonesian label for thumbnail branding
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    QNA: "❓ Tanya Jawab",
    KISAH: "📖 Kisah Islami",
    PEMBELAJARAN: "📚 Pembelajaran",
    ARTIKEL: "📝 Artikel",
  };
  return labels[category] || "📚 Adably";
}

// Map node title → KisahSubType for prompt generation
function nodeToSubType(title: string): KisahSubType {
  const t = title.toLowerCase();
  if (t.includes('sirah') || t.includes('nabawiyah') || t.includes('nabi muhammad')) return 'SIRAH';
  if (t.includes('qashash') || t.includes('anbiya') || t.includes('para nabi')) return 'QASHASH';
  if (t.includes('teladan') || t.includes('sahabat') || t.includes('ulama')) return 'TELADAN';
  if (t.includes('fiksi') || t.includes('cerita') || t.includes('modern')) return 'CERITA_FIKSI';
  return 'SIRAH'; // fallback
}

function generateStoryboardPrompt(
  script: string,
  artStyle: string,
  sbAspectRatio: AspectRatio,
): string {
  const arOption = ASPECT_RATIO_OPTIONS.find(a => a.value === sbAspectRatio) || ASPECT_RATIO_OPTIONS[0];

  // Estimate script length to set minimum scene count
  const wordCount = script.trim().split(/\s+/).length;
  const minScenes = wordCount < 300 ? 8 : wordCount < 600 ? 10 : wordCount < 1000 ? 12 : 15;

  return `═══════════════════════════════════════════
🎬 STORYBOARD PROMPT GENERATOR — Adably.id
═══════════════════════════════════════════

Kamu adalah STORYBOARD ARTIST dan PROMPT ENGINEER profesional untuk konten edukasi anak Islami.
Tugasmu: mengubah SCRIPT NARASI AUDIO menjadi serangkaian PROMPT GAMBAR per scene yang KAYA, DETAIL, dan KONSISTEN.

══════════════════════════════════════════
LANGKAH 1 — SEGMENTASI PARAGRAF (WAJIB DILAKUKAN PERTAMA)
══════════════════════════════════════════

Script di bawah ini adalah TEKS MENTAH tanpa penanda paragraf.
Sebelum membuat scene, kamu WAJIB memecah script menjadi PARAGRAF-PARAGRAF berdasarkan kriteria:

• Perubahan LOKASI (contoh: dari rumah → masjid → pasar)
• Perubahan WAKTU (contoh: pagi → malam, hari ini → esok hari)
• Perubahan EMOSI (contoh: senang → sedih → lega)
• Perubahan TOKOH yang sedang beraksi (contoh: ayah berbicara → anak berlari)
• Perubahan AKSI utama (contoh: berdoa → berjalan → bertemu seseorang)
• Jeda narasi natural (contoh: sebelum/sesudah dialog, sebelum klimaks)

ATURAN SEGMENTASI:
- Setiap paragraf hasil segmentasi = MINIMAL 1 scene (boleh 2 jika paragrafnya panjang/kaya visual)
- DILARANG menggabungkan lebih dari 3 kalimat narasi jadi 1 paragraf tunggal
- Momen DIAM/REFLEKTIF (tokoh berdoa, merenungi, memandang langit) juga LAYAK jadi scene tersendiri
- Dialog panjang antar tokoh: pecah per giliran bicara sebagai scene berbeda jika suasana/ekspresi berubah

══════════════════════════════════════════
LANGKAH 2 — ATURAN JUMLAH SCENE
══════════════════════════════════════════

⚠️ JUMLAH SCENE MINIMUM: ${minScenes} scene
(Dihitung dari panjang script: ~${wordCount} kata)

Rasio wajib:
- Script pendek (< 300 kata): MINIMAL 8 scene
- Script sedang (300–600 kata): MINIMAL 10 scene
- Script panjang (600–1000 kata): MINIMAL 12 scene
- Script sangat panjang (> 1000 kata): MINIMAL 15 scene

LEBIH BANYAK scene LEBIH BAIK — setiap momen visual yang bisa digambar HARUS punya scene-nya sendiri.
Jangan takut membuat terlalu banyak scene — lebih baik KELEBIHAN daripada KEKURANGAN.

Tipe momen yang WAJIB punya scene tersendiri:
✅ Momen pembuka/pengenalan tokoh (establishing shot)
✅ Setiap perubahan lokasi/setting
✅ Setiap dialog penting atau percakapan emosional
✅ Momen konflik/ujian/tantangan
✅ Momen klimaks (puncak cerita)
✅ Momen doa/ibadah
✅ Momen resolusi/kehangatan
✅ Momen penutup/ending (closing shot)
✅ Pemandangan alam/arsitektur yang disebut dalam narasi
✅ Momen transisi (perjalanan, perubahan waktu)

══════════════════════════════════════════
LANGKAH 3 — CHARACTER SHEET
══════════════════════════════════════════

BUAT CHARACTER SHEET di awal:
- Untuk SETIAP tokoh yang muncul, definisikan secara DETAIL:
  • Nama & usia
  • Pakaian lengkap (warna spesifik, motif, bahan)
  • Ciri khas fisik non-wajah (tinggi badan, postur, gestur khas)
  • Warna dominan karakter (untuk konsistensi visual)
  • Aksesoris atau benda yang sering dibawa

- Character sheet ini WAJIB di-COPY LENGKAP ke setiap scene prompt agar konsisten.
- SEMUA karakter manusia WAJIB FACELESS — TIDAK ADA fitur wajah (mata/hidung/mulut).
- Karakter HANYA digambarkan lewat: postur tubuh, bahasa tubuh, gestur tangan, pakaian, dan konteks adegan.

══════════════════════════════════════════
LANGKAH 4 — ATURAN ISLAMI
══════════════════════════════════════════

- Semua karakter memakai busana Islami/syar'i (hijab, jubah, gamis, kopiah).
- Nabi dan Rasul HANYA digambarkan sebagai SILUET BERCAHAYA (nur) — DILARANG KERAS menampilkan bentuk tubuh detail.
- DILARANG: menampilkan wajah, simbol non-Islam, konten kekerasan.
- Figur suci (Nabi, Malaikat) menggunakan cahaya/siluet saja.

══════════════════════════════════════════
LANGKAH 5 — STYLE LOCK (gunakan di SETIAP scene)
══════════════════════════════════════════

- Gaya Visual: ${artStyle}
- Aspek Rasio: ${sbAspectRatio} (${arOption.size})
- Nuansa: Ramah anak, warna-warni ceria, pencahayaan hangat (warm lighting)
- FACELESS: Semua karakter tanpa fitur wajah

══════════════════════════════════════════
SCRIPT NARASI AUDIO (SUMBER)
══════════════════════════════════════════
${script}

══════════════════════════════════════════
FORMAT OUTPUT YANG HARUS DIIKUTI
══════════════════════════════════════════

📐 STYLE GUIDE (copy ke setiap prompt):
"[Tuliskan style guide lengkap: gaya ${artStyle}, warna dominan, pencahayaan warm, aturan faceless, aspek rasio ${sbAspectRatio}]"

👤 CHARACTER SHEET:
- Tokoh 1: [Nama] — [usia], [pakaian: warna + jenis + motif], [postur/tinggi], [ciri khas non-wajah], [warna dominan karakter]
- Tokoh 2: [Nama] — [deskripsi lengkap dengan format sama]
- ... (SEMUA tokoh yang muncul dalam script, tanpa terkecuali)

📊 SEGMENTASI PARAGRAF:
[Tampilkan daftar paragraf hasil segmentasi — masing-masing dengan nomor dan 1 kalimat ringkasan isinya]
Contoh:
- P1: Pengenalan tokoh dan setting awal di rumah
- P2: Percakapan antara ayah dan anak tentang sholat
- P3: Perjalanan menuju masjid
- ...

⚠️ ATURAN: Deskripsi karakter dari CHARACTER SHEET WAJIB disalin LENGKAP ke setiap scene prompt agar AI image generator menghasilkan karakter yang 100% KONSISTEN di semua gambar.

═══════════════════════════════════════════

🖼️ SCENE 1 / [total] — [Judul Scene Singkat & Deskriptif]
Paragraf Sumber: P[nomor]
Narasi: "[kutipan 1-2 kalimat PERSIS dari script yang mewakili scene ini]"
Tipe Shot: [Establishing / Medium / Close-up / Wide / Over-the-shoulder / Bird's eye]
Prompt (ID): "[deskripsi visual SANGAT DETAIL dalam Bahasa Indonesia:
  1. Setting/latar: lokasi spesifik, waktu (pagi/sore/malam), cuaca, elemen arsitektur/alam
  2. Karakter: siapa, posisi di frame, postur tubuh, gestur tangan, arah menghadap
  3. Aksi: apa yang sedang dilakukan, interaksi antar tokoh
  4. Suasana/mood: pencahayaan (warm/dramatic/soft), warna dominan adegan
  5. Detail tambahan: benda/objek penting, elemen dekoratif islami
  6. Character reference LENGKAP dari character sheet
  7. Style guide reference]"
Prompt (EN): "[terjemahan LENGKAP ke Bahasa Inggris — siap paste langsung ke AI image generator. Sertakan: art style, aspect ratio ${sbAspectRatio}, faceless rule, semua detail visual]"

🖼️ SCENE 2 / [total] — [Judul Scene]
Paragraf Sumber: P[nomor]
Narasi: "..."
Tipe Shot: [...]
Prompt (ID): "..."
Prompt (EN): "..."

... (lanjutkan untuk SEMUA scene — MINIMAL ${minScenes} scene)

═══════════════════════════════════════════
CATATAN PENTING
═══════════════════════════════════════════
- Setiap Prompt (EN) harus bisa langsung di-paste ke Gemini, ChatGPT, DALL-E, Midjourney, atau AI image generator MANAPUN.
- JANGAN gunakan syntax khusus platform (seperti --ar, --v, --style). Gunakan deskripsi natural language.
- Pastikan transisi antar scene VISUAL MASUK AKAL (tidak loncat setting tanpa alasan).
- Setiap scene HARUS menyertakan character reference LENGKAP dari CHARACTER SHEET.
- VARIASIKAN tipe shot (jangan semua medium shot — gunakan establishing, close-up, wide, bird's eye).
- Scene PERTAMA harus selalu ESTABLISHING SHOT (memperkenalkan setting dan tokoh utama).
- Scene TERAKHIR harus selalu CLOSING SHOT (suasana hangat, penuh harapan, atau reflektif).
- DILARANG menghasilkan kurang dari ${minScenes} scene — jika kurang, pecah scene yang terlalu padat.
═══════════════════════════════════════════`;
}

function generateQuizPrompt(
  customTitle: string,
  topic: string,
  difficulty: string,
  count: number,
  includeImage: boolean,
  imageStyle: string,
): string {
  const topicGuides: Record<string, string> = {
    'Akidah': 'Rukun Iman, sifat-sifat Allah, tauhid, syirik, hari akhir, malaikat, kitab-kitab Allah, qada dan qadar',
    'Ibadah': 'Rukun Islam, sholat, puasa, zakat, haji, wudhu, tayamum, adzan, doa sehari-hari',
    'Akhlak': 'Akhlak mulia, adab makan, adab bertemu, sabar, jujur, amanah, kasih sayang, tolong menolong',
    'Sirah': 'Kisah Nabi Muhammad ﷺ, sahabat Nabi, peristiwa hijrah, Isra Mi\'raj, Fathu Makkah, perang Badar',
    'Al-Quran': 'Nama-nama surat, jumlah ayat, makna surat pendek, kisah dalam Al-Quran, adab membaca Al-Quran',
    'Hadits': 'Hadits pendek, riwayat Bukhari-Muslim, adab Nabi, sunah harian, keutamaan amal',
  };

  const titleSection = customTitle
    ? `PERTANYAAN SPESIFIK dari user:\n"${customTitle}"\n\nGunakan pertanyaan ini sebagai soal utama/pertama. Tambahkan ${count - 1} soal lainnya yang masih satu topik.`
    : `Buatkan ${count} soal quiz interaktif seputar topik: ${topic}\nCakupan materi: ${topicGuides[topic] || topic}`;

  const difficultyAge = difficulty.match(/\(([^)]+)\)/)?.[1] || '5-7 tahun';

  let imageSection = '';
  if (includeImage) {
    imageSection = `

═══ PROMPT GAMBAR PER SOAL ═══
Untuk SETIAP soal, buatkan juga prompt gambar (dalam bahasa Inggris) dengan aturan:
- Gaya: ${imageStyle}
- WAJIB FACELESS: Semua karakter manusia TIDAK BOLEH menampilkan wajah (punggung menghadap kamera, siluet, bayangan, tampak jauh, atau tertutup)
- Wajib memakai busana islami/syar'i (hijab, jubah, gamis, kopiah)
- Warna: Warm Islamic palette (emerald green, gold, deep blue, cream)
- DILARANG: Menampilkan wajah, salib, patung, simbol non-Islam
- Aspek rasio: 1:1 (square)
- Format output gambar: [IMAGE_PROMPT]: "..."`;
  }

  return `═══════════════════════════════════════════
🧩 QUIZ ISLAMI — PROMPT GENERATOR
═══════════════════════════════════════════

TOPIK: ${topic}
TINGKAT: ${difficulty}
TARGET USIA: Anak ${difficultyAge}
JUMLAH SOAL: ${count}

${titleSection}

═══ FORMAT OUTPUT WAJIB ═══

Untuk setiap soal, gunakan format PERSIS seperti ini:

---
SOAL [nomor]:
[Tuliskan pertanyaan dengan bahasa sederhana & menarik untuk anak]

A) [Pilihan A]
B) [Pilihan B]  
C) [Pilihan C]
D) [Pilihan D]

✅ JAWABAN: [Huruf yang benar]
📖 PENJELASAN: [Penjelasan singkat 1-2 kalimat, sertakan dalil dari Al-Quran/Hadits jika ada]${includeImage ? '\n[IMAGE_PROMPT]: "[Prompt gambar dalam bahasa Inggris]"' : ''}
---

═══ ATURAN KONTEN ═══
1. Setiap soal WAJIB memiliki 4 pilihan jawaban (A-D)
2. Bahasa sederhana sesuai usia ${difficultyAge}
3. Jawaban pengecoh harus masuk akal (tidak terlalu mudah ditebak)
4. Sertakan dalil Al-Quran atau Hadits shahih pada penjelasan (jika relevan)
5. Soal bervariasi: ada yang hafalan, pemahaman, dan penerapan
6. Gunakan emoji agar menarik untuk anak-anak
7. DILARANG: konten yang menyimpang dari Ahlussunnah wal Jamaah${imageSection}

═══════════════════════════════════════════`;
}

export default function PromptGeneratorPage() {
  const [mode, setMode] = useState<"CONTENT" | "IMAGE" | "QUIZ" | "STORYBOARD">("CONTENT");
  const [type, setType] = useState<ContentType>("QNA");
  const [title, setTitle] = useState("");
  const [kisahSubType, setKisahSubType] = useState<KisahSubType>("SIRAH");
  const [kisahNodes, setKisahNodes] = useState<any[]>([]);
  const [selectedKisahNodeId, setSelectedKisahNodeId] = useState("");
  const [ages, setAges] = useState<string[]>(["5-7"]);
  const [options, setOptions] = useState({
    dalil: true,
    analogi: true,
    dialog: true,
    tips: true,
    perbedaanPendapat: false,
    referensi: true,
  });


  // Fetch KISAH structure nodes dynamically
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
        // Auto-select first node and set subType
        if (flatNodes.length > 0) {
          setSelectedKisahNodeId(flatNodes[0].id);
          setKisahSubType(nodeToSubType(flatNodes[0].title));
        }
      }).catch(() => {});
    }
  }, []);

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
  const [thumbCategory, setThumbCategory] = useState<string>("QNA");
  const [includeCategoryLabel, setIncludeCategoryLabel] = useState(true);

  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ title: string; type: ContentType; prompt: string; date: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Intellectual Persona states
  const [selectedThinkers, setSelectedThinkers] = useState<string[]>([]);
  const [openModes, setOpenModes] = useState<string[]>([]);
  // POV for ARTIKEL type
  const [artikelPov, setArtikelPov] = useState<string>("");

  // Quiz states
  const [quizTopic, setQuizTopic] = useState<string>("Akidah");
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDifficulty, setQuizDifficulty] = useState<string>("Sedang (5-7 tahun)");
  const [quizCount, setQuizCount] = useState(3);
  const [quizIncludeImage, setQuizIncludeImage] = useState(true);
  const [quizImageStyle, setQuizImageStyle] = useState("Animasi 3D (Pixar/Disney)");

  // Storyboard states
  const [sbScript, setSbScript] = useState("");
  const [sbArtStyle, setSbArtStyle] = useState("Animasi 3D (Pixar/Disney)");
  const [sbAspectRatio, setSbAspectRatio] = useState<AspectRatio>("16:9");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  // Reset artikelPov when type changes away from ARTIKEL
  useEffect(() => { if (type !== "ARTIKEL") setArtikelPov(""); }, [type]);

  const handleGenerate = () => {
    if (mode === "QUIZ") {
      // Quiz mode: title is optional
      const prompt = generateQuizPrompt(quizTitle.trim(), quizTopic, quizDifficulty, quizCount, quizIncludeImage, quizImageStyle);
      setGeneratedPrompt(prompt);
      const entry = { title: quizTitle.trim() || `Quiz ${quizTopic}`, type: "IMAGE_PROMPT" as ContentType, prompt, date: new Date().toISOString() };
      const updated = [entry, ...history.filter(h => h.prompt !== prompt)].slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      toast.success("Quiz prompt berhasil di-generate!");
      return;
    }
    if (mode === "STORYBOARD") {
      if (!sbScript.trim()) return toast.error("Script narasi audio wajib diisi");
      const prompt = generateStoryboardPrompt(sbScript.trim(), sbArtStyle, sbAspectRatio);
      setGeneratedPrompt(prompt);
      const sbTitle = sbScript.trim().substring(0, 50) + (sbScript.trim().length > 50 ? "..." : "");
      const entry = { title: `🎬 ${sbTitle}`, type: "IMAGE_PROMPT" as ContentType, prompt, date: new Date().toISOString() };
      const updated = [entry, ...history.filter(h => h.prompt !== prompt)].slice(0, MAX_HISTORY);
      setHistory(updated);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      toast.success("Storyboard prompt berhasil di-generate!");
      return;
    }
    if (!title.trim()) return toast.error("Judul/topik wajib diisi");
    let prompt = "";
    let historyType: ContentType = type;
    if (mode === "CONTENT") {
      prompt = generatePrompt(type, title.trim(), ages, options, kisahSubType, selectedThinkers, artikelPov);
    } else {
      prompt = generateImagePrompt(title.trim(), imageStyle, scenePreset, familyChars, prophetCompanion, childCount, childGender, singleChar, imageExtras, includeText, aspectRatio, thumbCategory, includeCategoryLabel);
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
            className={`flex-1 md:px-5 py-2 text-sm font-bold rounded-lg transition-all ${mode === "CONTENT" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            📝 Teks
          </button>
          <button 
            onClick={() => { setMode("IMAGE"); setGeneratedPrompt(""); }} 
            className={`flex-1 md:px-5 py-2 text-sm font-bold rounded-lg transition-all ${mode === "IMAGE" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            🖼️ Thumbnail
          </button>
          <button 
            onClick={() => { setMode("QUIZ"); setGeneratedPrompt(""); }} 
            className={`flex-1 md:px-5 py-2 text-sm font-bold rounded-lg transition-all ${mode === "QUIZ" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            🧩 Quiz
          </button>
          <button 
            onClick={() => { setMode("STORYBOARD"); setGeneratedPrompt(""); }} 
            className={`flex-1 md:px-5 py-2 text-sm font-bold rounded-lg transition-all ${mode === "STORYBOARD" ? "bg-white shadow-sm text-purple-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            🎬 Storyboard
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

              {/* Sub-Kategori Kisah — dari "Kelola Struktur Kisah" */}
              {type === "KISAH" && (
                <div className="bg-amber-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                  <label className="block text-sm font-bold text-amber-800 mb-3">1b. Pilih Sub-Kategori Kisah</label>
                  {kisahNodes.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {kisahNodes.map(node => (
                        <button key={node.id} onClick={() => { setSelectedKisahNodeId(node.id); setKisahSubType(nodeToSubType(node.title)); }} className={`p-4 rounded-xl text-left border-2 transition-all ${selectedKisahNodeId === node.id ? "border-amber-500 bg-amber-100 shadow-sm" : "border-amber-200 hover:border-amber-300 bg-white"}`}>
                          <span className="text-2xl">{nodeToSubType(node.title) === "SIRAH" ? "👑" : nodeToSubType(node.title) === "QASHASH" ? "📜" : nodeToSubType(node.title) === "TELADAN" ? "⭐" : "🌙"}</span>
                          <p className="font-bold text-sm text-slate-800 mt-1">{node.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Tipe: {nodeToSubType(node.title)}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">Belum ada sub-kategori. Tambahkan di <span className="font-bold">Kelola Struktur Kisah</span>.</p>
                  )}
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
          ) : mode === "IMAGE" ? (
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

              {/* Kategori Konten section removed — moved to Konteks Tambahan toggle */}

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
                  {/* Label Kategori Toggle */}
                  <div className={`rounded-xl border transition-all ${includeCategoryLabel ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`}>
                    <label className={`flex items-start gap-3 p-3 cursor-pointer text-sm font-medium transition-all ${includeCategoryLabel ? "text-emerald-800" : "text-slate-600"}`}>
                      <input type="checkbox" checked={includeCategoryLabel} onChange={e => setIncludeCategoryLabel(e.target.checked)} className="w-4 h-4 mt-0.5 text-emerald-600 rounded" />
                      <div>
                        <p className="font-bold">Sertakan Label Kategori di Thumbnail</p>
                        <p className="text-xs mt-0.5 opacity-80">Label kategori konten akan ditampilkan di branding (sudut kiri atas gambar).</p>
                      </div>
                    </label>
                    {includeCategoryLabel && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { value: "QNA", label: "Tanya Jawab", icon: "❓" },
                            { value: "KISAH", label: "Kisah Islami", icon: "📖" },
                            { value: "PEMBELAJARAN", label: "Pembelajaran", icon: "📚" },
                            { value: "ARTIKEL", label: "Artikel", icon: "📝" },
                          ].map(cat => (
                            <button key={cat.value} onClick={() => setThumbCategory(cat.value)} className={`py-2 px-1 rounded-lg text-center border transition-all text-xs font-bold ${thumbCategory === cat.value ? "border-emerald-400 bg-emerald-100 text-emerald-800 shadow-sm" : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"}`}>
                              <span className="text-base">{cat.icon}</span>
                              <p className="mt-0.5">{cat.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
          ) : mode === "QUIZ" ? (
            <>
              {/* Quiz Form */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">1. Topik Quiz</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {["Akidah", "Ibadah", "Akhlak", "Sirah", "Al-Quran", "Hadits"].map(t => (
                    <button key={t} onClick={() => setQuizTopic(t)} className={`p-3 rounded-xl text-center border-2 transition-all text-sm font-bold ${quizTopic === t ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Judul Pertanyaan <span className="text-xs font-normal text-slate-400">(opsional — kosongkan agar AI buat otomatis)</span></label>
                <textarea
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-purple-400 resize-none"
                  placeholder="Contoh: Siapakah nabi yang dilempar ke dalam api, tapi apinya berubah menjadi dingin?"
                />
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">3. Tingkat Kesulitan</label>
                  <div className="grid grid-cols-3 gap-3">
                    {["Mudah (3-5 tahun)", "Sedang (5-7 tahun)", "Sulit (8-10 tahun)"].map(d => (
                      <button key={d} onClick={() => setQuizDifficulty(d)} className={`p-3 rounded-xl text-center border-2 transition-all text-xs font-bold ${quizDifficulty === d ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">4. Jumlah Soal: <span className="text-purple-600">{quizCount}</span></label>
                  <div className="flex gap-3">
                    {[1, 3, 5, 10].map(n => (
                      <button key={n} onClick={() => setQuizCount(n)} className={`flex-1 py-2.5 text-sm font-bold rounded-xl border-2 transition-all ${quizCount === n ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Image prompt toggle */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${quizIncludeImage ? "border-purple-200 bg-purple-50 text-purple-800" : "border-slate-200 text-slate-600"}`}>
                  <input type="checkbox" checked={quizIncludeImage} onChange={e => setQuizIncludeImage(e.target.checked)} className="w-4 h-4 mt-0.5 text-purple-600 rounded" />
                  <div>
                    <p className="font-bold">🖼️ Sertakan Prompt Gambar per Soal</p>
                    <p className="text-xs mt-0.5 opacity-80">AI akan generate prompt gambar (faceless, salaf-friendly) untuk setiap pertanyaan quiz</p>
                  </div>
                </label>
                {quizIncludeImage && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-2">Gaya Gambar</label>
                    <div className="grid grid-cols-2 gap-2">
                      {["Animasi 3D (Pixar/Disney)", "Ilustrasi Vektor 2D", "Buku Cerita Anak (Watercolor)", "Fotografi Realistis"].map(s => (
                        <button key={s} onClick={() => setQuizImageStyle(s)} className={`p-2.5 rounded-xl text-xs font-bold border-2 transition-all ${quizImageStyle === s ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500"}`}>
                          {s.split("(")[0].trim()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : mode === "STORYBOARD" ? (
            <>
              {/* Panduan Storyboard */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <h3 className="font-bold text-amber-800 text-sm">Apa itu Storyboard Prompt?</h3>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">Fitur ini mengubah <strong>script narasi audio</strong> (dari fitur Export Script Audio) menjadi <strong>prompt gambar per scene</strong> yang konsisten. Hasilnya bisa langsung di-paste ke Gemini, ChatGPT, DALL-E, atau AI image generator manapun.</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-[11px] text-amber-600 font-bold">✔ AI menentukan pembagian scene otomatis</p>
                      <p className="text-[11px] text-amber-600 font-bold">✔ Character Sheet untuk konsistensi karakter</p>
                      <p className="text-[11px] text-amber-600 font-bold">✔ Prompt dwibahasa (ID + EN) untuk fleksibilitas</p>
                      <p className="text-[11px] text-amber-600 font-bold">✔ Aturan Islami otomatis (faceless, hijab, siluet nabi)</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Script Input */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">1. Paste Script Narasi Audio</label>
                <p className="text-xs text-slate-400 mb-3">Ambil dari: Editor → Export → Script Audio (.txt). Paste seluruh isi script di bawah.</p>
                <textarea
                  value={sbScript}
                  onChange={e => setSbScript(e.target.value)}
                  rows={10}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-purple-500 resize-y font-mono leading-relaxed"
                  placeholder={`Contoh script narasi audio:\n\nAssalamualaikum warahmatullahi wabarakatuh, teman-teman!\n\nHari ini kita akan mendengar kisah yang sangat menakjubkan...\nNabi Ibrahim berdiri tegak menghadapi api yang menyala-nyala...\n\n(Paste seluruh script audio dari fitur Export)`}
                />
                {sbScript.trim() && (
                  <p className="text-xs text-emerald-600 mt-2 font-medium">✔ {sbScript.trim().split(/\s+/).length} kata terdeteksi</p>
                )}
              </div>

              {/* Art Style */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">2. Pilih Gaya Visual</label>
                <div className="grid grid-cols-2 gap-3">
                  {imageStyles.map(t => (
                    <button key={t.value} onClick={() => setSbArtStyle(t.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${sbArtStyle === t.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="text-2xl">{t.icon}</span>
                      <p className="font-bold text-sm text-slate-800 mt-1">{t.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">3. Aspek Rasio Scene</label>
                <div className="grid grid-cols-3 gap-3">
                  {ASPECT_RATIO_OPTIONS.map(ar => (
                    <button key={ar.value} onClick={() => setSbAspectRatio(ar.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${sbAspectRatio === ar.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="text-2xl">{ar.icon}</span>
                      <p className="font-bold text-sm text-slate-800 mt-1">{ar.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ar.desc}</p>
                      <p className="text-[10px] text-purple-600 font-bold mt-1">{ar.size} · {ar.value}</p>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

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
            <h3 className="font-bold text-purple-800 text-sm mb-2">📋 Cara Pakai ({mode === "CONTENT" ? "Teks" : mode === "IMAGE" ? "Thumbnail" : mode === "QUIZ" ? "Quiz" : "Storyboard"})</h3>
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
            ) : mode === "STORYBOARD" ? (
              <ol className="text-xs text-purple-700 space-y-1.5 list-decimal list-inside">
                <li>Buka konten di <strong>Editor</strong></li>
                <li>Klik <strong>Export</strong> → pilih <strong>Script Audio (.txt)</strong></li>
                <li>Buka file .txt, <strong>copy seluruh isi</strong></li>
                <li>Paste ke kolom script di tab ini</li>
                <li>Pilih gaya visual & aspek rasio</li>
                <li>Klik <strong>Generate Prompt</strong></li>
                <li>Salin prompt → paste ke <strong>Gemini / ChatGPT / DALL-E</strong></li>
                <li>Generate gambar <strong>per scene</strong></li>
                <li>Gunakan untuk <strong>video slideshow</strong> atau ilustrasi cerita</li>
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
