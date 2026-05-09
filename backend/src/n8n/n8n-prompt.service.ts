import { Injectable } from '@nestjs/common';

/**
 * Prompt generator for n8n bot — mirrors the frontend prompt-generator logic.
 * Single source of truth for all content prompts used by the Telegram bot.
 * Dialog blocks are intentionally excluded (not suitable for bot workflow).
 */

export interface GeneratePromptDto {
  type: 'QNA' | 'ARTICLE' | 'PEMBELAJARAN' | 'KISAH';
  title: string;
  subType?: 'SIRAH' | 'QASHASH' | 'TELADAN' | 'FIKSI';
  ageGroups?: string[];
}

export interface GenerateThumbPromptDto {
  title: string;
  ratio: '16:9' | '1:1' | '4:5';
}

@Injectable()
export class N8nPromptService {

  // ═══════════════════════════════════════════════
  // Content Prompt Generator
  // ═══════════════════════════════════════════════

  generatePrompt(dto: GeneratePromptDto): string {
    const { type, title, subType, ageGroups } = dto;
    if (type === 'KISAH') return this.generateKisahPrompt(subType || 'SIRAH', title);
    return this.generateContentPrompt(type, title, ageGroups || ['3-5', '5-7', '7-10']);
  }

  // ═══════════════════════════════════════════════
  // Thumbnail Prompt Generator
  // ═══════════════════════════════════════════════

  generateThumbnailPrompt(dto: GenerateThumbPromptDto): string {
    const { title, ratio } = dto;
    const sizeMap: Record<string, string> = { '16:9': '1280×720', '1:1': '1080×1080', '4:5': '1080×1350' };
    const arLabel = ratio === '16:9' ? 'Widescreen 16:9' : ratio === '1:1' ? 'Square 1:1' : 'Portrait 4:5';
    return `Tolong buatkan gambar (image generation) untuk thumbnail konten edukasi anak Islami.

Konteks Judul: "${title}"

Spesifikasi Wajib:
- Gaya Visual: Animasi 3D (Pixar/Disney)
- Nuansa: Ramah anak, warna-warni ceria, pencahayaan hangat (warm lighting)
- Aspek Rasio: ${arLabel} (Sangat Penting!)
- Resolusi Target: ${sizeMap[ratio]}
- Karakter: Keluarga muslim — ayah berjenggot (koko/jubah), ibu berhijab syar'i panjang. Semua WAJIB FACELESS — TIDAK ADA fitur wajah (mata/hidung/mulut) — wajah harus kosong/blank.
- ATURAN KETAT: TIDAK BOLEH ADA TEKS, HURUF, ATAU TULISAN APAPUN. Sediakan Negative Space untuk penambahan teks manual.
- WATERMARK: Tambahkan teks kecil "adably.id" di sudut kanan bawah gambar dengan font tipis semi-transparan (opacity 40-60%).

(English reference for AI engine):
"Islamic kids education thumbnail: ${title}. Style: 3D Pixar/Disney animation. Muslim family characters — STRICTLY FACELESS (no eyes, no nose, no mouth — completely blank faces). Warm lighting, vibrant child-friendly colors. Resolution: ${sizeMap[ratio]}. NO TEXT, NO LETTERS, negative space for manual text. Small semi-transparent 'adably.id' watermark at bottom-right corner. --ar ${ratio}"`;
  }

  // ═══════════════════════════════════════════════
  // QNA / ARTICLE / PEMBELAJARAN Prompt
  // ═══════════════════════════════════════════════

  private generateContentPrompt(type: string, title: string, ages: string[]): string {
    const ageLabel = ages.length ? ages.map(a => a === 'Semua Usia' ? 'semua usia' : `${a} tahun`).join(', ') : 'semua usia';
    const typeLabel = type === 'QNA' ? 'Tanya Jawab' : type === 'PEMBELAJARAN' ? 'Pembelajaran' : 'Artikel';

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
3. Jika terdapat lebih dari 1 sumber hukum (Al-Quran, Hadits, Ijma', Qiyas), semuanya WAJIB dicantumkan.
4. Konten tidak boleh mengandung unsur SARA, ujaran kebencian, atau fitnah.
5. Gunakan bahasa yang lembut, ramah anak, dan mudah dipahami oleh anak usia ${ageLabel}.
6. Jangan membuat konten yang menakut-nakuti anak.

═══════════════════════════════════════
TUGAS:
Buatkan konten "${typeLabel}" dengan judul: "${title}"
Target pembaca: anak usia ${ageLabel}
═══════════════════════════════════════

FORMAT OUTPUT YANG HARUS KAMU IKUTI:

Platform kami menggunakan sistem "Blok Konten". Kamu HARUS memberikan output dalam format blok-blok berikut.

═══ METADATA ═══
- Judul: [judul konten yang menarik]
- Deskripsi Singkat: [1-2 kalimat ringkasan konten]
- Kelompok Usia: ${ageLabel}
- Tag: [3-5 kata kunci relevan, dipisah koma]

═══ BLOK KONTEN ═══

`;

    // Type-specific blocks
    if (type === 'QNA') {
      prompt += `URUTAN BLOK YANG DIREKOMENDASIKAN (ikuti urutan ini untuk alur terbaik):
1. 💡 JAWABAN INSTAN — langsung jawab pertanyaan anak (quick_answer)
2. 📖 DALIL — landasan dari Al-Quran/Hadits (dalil)
3. 🧩 ANALOGI — perumpamaan dari kehidupan anak (analogy)
4. 📝 ISI KONTEN — penjelasan tambahan jika perlu detail lebih (paragraph)
5. ℹ️ TIPS — panduan praktis untuk orangtua (tip)
6. ✨ HIKMAH — refleksi penutup (hikmah)
7. 🤲 DOA — doa relevan (doa)

KUNCI ALUR: Setiap blok harus TERASA SAMBUNGAN dari blok sebelumnya.

💡 BLOK: JAWABAN INSTAN (quick_answer)
Jawaban singkat dan langsung. Maksimal 2-3 kalimat yang menjawab inti pertanyaan.

`;
    } else if (type === 'PEMBELAJARAN') {
      prompt += `URUTAN BLOK PEDAGOGIS (ikuti urutan ini untuk pembelajaran efektif):
1. 📝 HOOK — buka dengan pertanyaan/fakta/cerita pendek yang buat anak PENASARAN (paragraph)
2. 📝 PENJELASAN INTI — jelaskan konsep utama dengan bahasa sederhana (paragraph)
3. 📖 DALIL — tunjukkan landasannya dari Al-Quran/Hadits (dalil)
4. 🧩 ANALOGI — buat konsep lebih mudah dimengerti (analogy)
5. 📝 PRAKTIK — langkah konkret yang bisa dilakukan anak (paragraph)
6. ℹ️ TIPS — panduan untuk orang tua (tip)
7. ✨ HIKMAH — refleksi mengapa ini penting (hikmah)
8. 🤲 DOA — doa yang relevan (doa)

KUNCI: Setiap blok harus menjawab "lalu apa?" dari blok sebelumnya.

📝 BLOK: ISI KONTEN (paragraph)
Gunakan bahasa yang mudah dipahami anak. Buka dengan HOOK terlebih dulu, lalu penjelasan inti.

`;
    } else { // ARTIKEL
      prompt += `PANDUAN MENULIS ARTIKEL:
- Buka dengan HOOK — jangan langsung masuk materi.
- Gunakan contoh nyata dari kehidupan anak/keluarga.
- Setiap heading harus membuat pembaca ingin baca bagian selanjutnya.
- Tutup setiap section dengan kalimat yang menghubungkan ke section berikutnya.
- Akhiri dengan CALL TO ACTION yang hangat dan mendorong tindakan.

📝 BLOK: ISI KONTEN (paragraph)
Tulis narasi artikel yang mengalir, menginspirasi, dan terasa personal — bukan ceramah.

`;
    }

    // Common blocks
    prompt += `📖 BLOK: DALIL/LANDASAN (dalil)
Sumber hukum Islam yang relevan. PENTING: Dalam 1 blok dalil bisa ada BANYAK sumber dalil sekaligus. Setiap dalil berisi:
- Teks Arab (jika tersedia)
- Terjemahan / isi dalil dalam Bahasa Indonesia
- Sumber yang JELAS (contoh: QS. Al-Baqarah: 43, HR. Bukhari No. 8)

Format:
---
DALIL:
Dalil 1:
  Arab: (teks arab)
  Terjemahan: "(terjemahan)"
  Sumber: (sumber)
  Sumber URL: (URL — lihat panduan di bawah)

Dalil 2:
  Arab: (jika ada)
  Terjemahan: "..."
  Sumber: (sumber)
  Sumber URL: (URL)
---

⚠️ PANDUAN URL SUMBER:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat]
  Contoh: QS. An-Nisa: 103 → https://quran.com/4/103
- Hadits: https://www.hadits.id/hadits/[nama-kitab]/[nomor]
  Contoh: HR. Bukhari No. 8 → https://www.hadits.id/hadits/bukhari/8
- 🛑 JANGAN MENGARANG URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".

🧩 BLOK: ANALOGI KONTEKSTUAL (analogy)
Analogi HARUS relevan dengan usia target DAN lahir dari konteks konten yang sudah kamu tulis.

ATURAN:
1. Baca ulang konten yang sudah kamu tulis → ambil elemen di dalamnya → jadikan analogi.
2. TEST MANDIRI: Jika analogi ini bisa dipakai untuk topik LAIN tanpa perubahan → terlalu generik, buat ulang.

Format:
---
ANALOGI:
Judul: "[judul spesifik]"
Isi: "[2-3 kalimat menggunakan referensi dari konten]"
---

ℹ️ BLOK: TIPS ORANG TUA (tip)
Tips praktis untuk orang tua dalam menjelaskan topik ini ke anak di rumah.

✨ BLOK: HIKMAH / PELAJARAN (hikmah)
Pelajaran utama atau refleksi mendalam dari topik ini.
Tulis 1-3 poin hikmah yang menyentuh hati dan relevan.

🤲 BLOK: DOA (doa)
⚠️ ATURAN KETAT DOA:
1. WAJIB bersumber dari Al-Quran atau Hadits SHAHIH SAJA.
2. DILARANG KERAS mencantumkan doa dari hadits dha'if, maudhu' (palsu), atau munkar.
3. Setiap doa WAJIB disertai sumber yang jelas dan dapat diverifikasi.

Format:
---
DOA:
Judul: "(nama doa singkat)"
Arab: (teks arab doa)
Terjemahan: "(terjemahan)"
Sumber: (sumber shahih)
Sumber URL: (URL — JANGAN mengarang)
---

`;

    // Age guidelines
    prompt += `═══ PANDUAN PENYESUAIAN USIA ═══\n`;
    if (ages.includes('3-5')) prompt += `- Usia 3-5 tahun: Kalimat SANGAT sederhana. Analogi dari mainan, hewan, makanan.\n`;
    if (ages.includes('5-7')) prompt += `- Usia 5-7 tahun: Kalimat sederhana. Analogi dari sekolah, teman, keluarga.\n`;
    if (ages.includes('7-10')) prompt += `- Usia 7-10 tahun: Boleh lebih detail. Konsep sebab-akibat.\n`;
    if (ages.includes('10-13')) prompt += `- Usia 10-13 tahun: Lebih kompleks dan mendalam. Berpikir kritis.\n`;

    prompt += `
═══ CATATAN AKHIR ═══
- Susun blok-blok di atas dalam urutan yang PALING LOGIS dan MENGALIR
- Pastikan setiap dalil memiliki sumber yang jelas dan bisa diverifikasi
- Buat konten yang menarik, tidak membosankan, dan membuat anak ingin terus membaca

━━━ 🕌 PEMBUKAAN / MUKADIMAH (opening) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini akan disimpan di field "Pembukaan (Mukadimah)".

Tulis salam pembuka yang hangat dan relevan dengan topik.
- Awali dengan "Assalamualaikum warahmatullahi wabarakatuh"
- Lanjutkan dengan 1-2 kalimat pengantar yang sesuai tema dan usia target.
- Sapa anak langsung: "Teman-teman...", "Adik-adik..."

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini akan disimpan di field "Penutupan".

Tulis penutup yang menginspirasi.
- Rangkum pelajaran utama dalam 1-2 kalimat.
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"`;

    return prompt;
  }

  // ═══════════════════════════════════════════════
  // Kisah Prompt Generator (with sub-types)
  // ═══════════════════════════════════════════════

  private generateKisahPrompt(subType: string, title: string): string {
    const TARGET_USIA = '3–10 tahun';
    const subTypeLabel = subType === 'SIRAH' ? 'Sirah Nabawiyah (Nabi Muhammad ﷺ)'
      : subType === 'QASHASH' ? "Qashashul Anbiya' (Kisah Para Nabi)"
      : subType === 'TELADAN' ? 'Teladan Sahabat & Ulama'
      : 'Cerita Fiksi Islami';

    let prompt = `Kamu adalah PENULIS KISAH ISLAMI untuk platform edukasi anak "Adably". Tugasmu membuat naskah kisah yang PANJANG, KAYA DETAIL, dan MENGALIR seperti seorang pencerita ulung — bukan sekadar ringkasan. Konten ini akan DIBACAKAN melalui fitur audio.\n\n`;

    // Sub-type specific rules
    if (subType === 'SIRAH') {
      prompt += `══════════════════════════════════════════
ATURAN WAJIB — SIRAH NABAWIYAH (Khusus Nabi Muhammad ﷺ)
══════════════════════════════════════════
1. Sub-tipe ini KHUSUS untuk kisah perjalanan hidup Nabi Muhammad ﷺ saja.
2. Ikuti HANYA fakta dari kitab Sirah mu'tabar:
   • Ibnu Hisyam (Sirah Nabawiyah)
   • Ar-Rahiqul Makhtum (Shafiyyurrahman Al-Mubarakfuri)
   • Sirah Ibnu Katsir (Al-Bidayah Wan Nihayah)
3. Dialog BOLEH dimuat dalam narasi HANYA jika bersumber dari riwayat shahih. Cantumkan sumbernya.
4. JANGAN gambarkan wajah atau ciri fisik detail Nabi. Cukup sebut kemuliaan dan sifat agungnya.
5. JANGAN tambahkan kejadian, dialog, atau detail yang tidak ada dalam riwayat.\n\n`;
    } else if (subType === 'QASHASH') {
      prompt += `══════════════════════════════════════════
ATURAN WAJIB — QASHASHUL ANBIYA' (Kisah Para Nabi)
══════════════════════════════════════════
1. Sub-tipe ini untuk kisah para nabi SELAIN Nabi Muhammad ﷺ.
2. Ikuti HANYA fakta dari: Al-Quran, Tafsir Ibnu Katsir, Qashashul Anbiya' (Ibnu Katsir), Tafsir Ath-Thabari.
3. Dialog BOLEH dimuat HANYA jika bersumber dari ayat Al-Quran atau riwayat shahih. Cantumkan sumbernya.
4. JANGAN gambarkan wajah atau ciri fisik detail nabi.
5. JANGAN tambahkan kejadian yang tidak ada dalam Al-Quran atau riwayat mu'tabar.\n\n`;
    } else if (subType === 'TELADAN') {
      prompt += `══════════════════════════════════════════
ATURAN WAJIB — TELADAN SAHABAT / ULAMA
══════════════════════════════════════════
1. Ikuti fakta dari kitab tarikh mu'tabar:
   • Siyar A'lam An-Nubala (Imam Adz-Dzahabi)
   • Al-Isabah fi Tamyiz Ash-Shahabah (Ibnu Hajar)
2. Dialog BOLEH dimuat jika bersumber dari riwayat shahih. Cantumkan sumbernya.
3. JANGAN tambahkan kejadian atau dialog fiktif tanpa dasar riwayat.\n\n`;
    } else {
      prompt += `══════════════════════════════════════════
ATURAN WAJIB — CERITA FIKSI ISLAMI
══════════════════════════════════════════
1. Karakter dan cerita BERSIFAT FIKTIF — tidak mengklaim kisah nyata.
2. Nilai Islam (sholat, sedekah, jujur, sabar, dll.) harus TERSELIP ALAMI dalam alur cerita.
3. Setting: kehidupan sehari-hari anak muslim (keluarga, sekolah, taman, masjid).
4. Dialog antar tokoh BEBAS dibuat sesuai alur cerita yang menarik.
5. JANGAN cantumkan blok dalil Al-Quran/Hadits terpisah (boleh disebut ringan dalam narasi).\n\n`;
    }

    prompt += `══════════════════════════════════════════
TUGAS
══════════════════════════════════════════
Buatkan konten "${subTypeLabel}" dengan judul: "${title}"
Target pembaca  : Anak usia ${TARGET_USIA}
Gaya penyampaian: PENCERITA — panjang, mengalir, penuh detail adegan & suasana
Panjang minimum : 600–1.000 kata untuk isi kisah utama

══════════════════════════════════════════
FORMAT OUTPUT — METADATA
══════════════════════════════════════════
• Judul    : [judul kisah yang menarik dan sesuai anak]
• Deskripsi: [2–3 kalimat ringkasan yang menggugah rasa ingin tahu]
• Usia     : ${TARGET_USIA}
• Tag      : [4–6 kata kunci relevan, pisahkan koma]

══════════════════════════════════════════
FORMAT OUTPUT — BLOK KONTEN EDITOR ADABLY
══════════════════════════════════════════
Susun konten menggunakan blok-blok berikut.

━━━ 📝 BLOK 1: ISI KONTEN (paragraph + heading) — WAJIB PANJANG & MENGALIR ━━━
Tulis kisah menggunakan ARC EMOSIONAL berikut:

━ FASE 1 — HOOK (1 paragraf)
[PARAGRAPH] Pembuka yang LANGSUNG menarik perhatian dalam kalimat pertama.

━ FASE 2 — SETUP (1–2 paragraf)
[PARAGRAPH] Perkenalkan tokoh, tempat, waktu, dan suasana secara hangat.

━ FASE 3 — KONFLIK / UJIAN (2–3 paragraf)
[HEADING] [nama babak]
[PARAGRAPH] Ini jantung cerita. Tunjukkan perjuangan, keraguan, dan tekanan.

━ FASE 4 — KLIMAKS (1–2 paragraf)
[HEADING] [nama babak — momen paling intens]
[PARAGRAPH] Keputusan besar, pertolongan Allah, atau momen yang mengubah segalanya.

━ FASE 5 — RESOLUSI & KEHANGATAN (1–2 paragraf)
[PARAGRAPH] Tunjukkan buah dari kesabaran/keimanan.

ATURAN TRANSISI WAJIB:
- Setiap fase HARUS mengalir ke fase berikutnya dengan kalimat penghubung.
- Urutan fase TIDAK BOLEH ditukar.

`;

    if (subType !== 'FIKSI') {
      prompt += `━━━ 📖 BLOK 2: DALIL / LANDASAN (dalil) ━━━
Cantumkan 1–2 ayat Al-Quran atau Hadits Shahih yang relevan.
Format per dalil:
• Arabic  : [teks arab]
• Terjemah: [terjemahan bahasa Indonesia]
• Sumber  : [nama surah + ayat, atau kitab hadits + nomor]
• Sumber URL: [URL sumber]

⚠️ PANDUAN URL SUMBER:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat]
- Hadits: https://www.hadits.id/hadits/[kitab]/[nomor]
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN.

`;
    }

    prompt += `━━━ 🧩 BLOK ANALOGI ORGANIK (analogy) ━━━
Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam kisah di atas.
ATURAN:
1. Ambil benda/situasi/tokoh yang sudah muncul → jadikan analogi.
2. TEST MANDIRI: Jika analogimu bisa dipakai untuk topik LAIN → terlalu generik, buat ulang.

Format:
• Judul: [ambil dari elemen dalam kisah]
• Penjelasan: [2–3 kalimat]

━━━ ℹ️ BLOK TIPS (tip) ━━━
Tips WAJIB merupakan REFLEKSI NATURAL dari momen spesifik dalam kisah.
Tulis 3–4 poin, hangat dan memotivasi — BUKAN ceramah.

━━━ ✨ BLOK HIKMAH (hikmah) ━━━
Pelajaran utama yang dapat dipetik dari kisah ini.
Tulis hikmah yang menyentuh hati, relevan bagi anak, dan menginspirasi.

`;

    if (subType !== 'FIKSI') {
      prompt += `━━━ 🤲 BLOK DOA (doa) ━━━
⚠️ ATURAN KETAT DOA:
1. WAJIB bersumber dari Al-Quran atau Hadits SHAHIH SAJA.
2. DILARANG KERAS doa dari hadits dha'if, maudhu' (palsu), atau munkar.
Format per doa:
• Judul : [nama doa singkat]
• Arab  : [teks arab doa]
• Terjemah: [terjemahan]
• Sumber: [sumber shahih]
• Sumber URL: [URL — JANGAN mengarang]

`;
    }

    prompt += `══════════════════════════════════════════
PANDUAN PENULISAN — GAYA PENCERITA
══════════════════════════════════════════
✅ Tulis seperti MENDONGENG — gambarkan suasana, cuaca, perasaan, warna, suara
✅ Gunakan kalimat aktif: "Matanya berbinar...", "Angin berhembus pelan..."
✅ Bahasa SEDERHANA tapi KAYA — anak usia ${TARGET_USIA} bisa memahaminya saat didengarkan
✅ Konten ini akan DIBACAKAN audio — pastikan kalimat enak didengar & mengalir
✅ Sapa anak di mukadimah: "Teman-teman...", "Adik-adik..."
✅ Nilai Islam terasa ALAMI dalam cerita
❌ JANGAN terlalu singkat — ini KISAH LENGKAP
❌ JANGAN menggurui atau berceramah langsung

━━━ 🕌 PEMBUKAAN / MUKADIMAH (opening) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini disimpan di field "Pembukaan (Mukadimah)".

Tulis salam pembuka yang hangat dan relevan dengan tema kisah.
- Awali dengan "Assalamualaikum warahmatullahi wabarakatuh"
- Sapa anak langsung: "Teman-teman...", "Adik-adik..."

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini disimpan di field "Penutupan".

Tulis penutup yang menyentuh dan menginspirasi.
- Rangkum pelajaran utama dalam 1-2 kalimat.
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"`;

    return prompt;
  }
}
