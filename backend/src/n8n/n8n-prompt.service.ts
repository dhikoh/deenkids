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
  selectedThinkers?: string[];
  pov?: string; // 'ORTU' | 'ANAK' — only for ARTICLE type
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
    const { type, title, subType, ageGroups, selectedThinkers, pov } = dto;
    if (type === 'KISAH') return this.generateKisahPrompt(subType || 'SIRAH', title, selectedThinkers || []);
    return this.generateContentPrompt(type, title, ageGroups || ['3-5', '5-7', '7-10'], selectedThinkers || [], pov || '');
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

  private generateContentPrompt(type: string, title: string, ages: string[], selectedThinkers: string[], pov: string): string {
    const ageLabel = ages.length ? ages.map(a => a === 'Semua Usia' ? 'semua usia' : `${a} tahun`).join(', ') : 'semua usia';
    const typeLabel = type === 'QNA' ? 'Tanya Jawab' : type === 'PEMBELAJARAN' ? 'Pembelajaran' : 'Artikel';
    let povText = '';
    if (type === 'ARTICLE' && pov) {
      povText = pov === 'ORTU'
        ? '\nSudut Pandang: ORANG TUA → Tulis untuk orang tua yang ingin mendidik anak. Gunakan bahasa orang dewasa yang reflektif, empatis, dan actionable (bisa langsung dipraktikkan). Fokus pada tips, panduan parenting, dan insight mendidik.'
        : '\nSudut Pandang: ANAK → Tulis dari perspektif anak atau untuk anak yang lebih dewasa (10-13 tahun). Gunakan bahasa yang relatable, segar, dan memotivasi. Fokus pada pengalaman, rasa ingin tahu, dan pembentukan karakter anak.';
    }

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
4. Jika terdapat perbedaan pendapat di kalangan ulama, sampaikan pendapat-pendapat tersebut beserta dalil masing-masing secara adil dan berimbang.
5. Konten tidak boleh mengandung unsur SARA, ujaran kebencian, atau fitnah.
6. Gunakan bahasa yang lembut, ramah anak, dan mudah dipahami oleh anak usia ${ageLabel}.
7. Jangan membuat konten yang menakut-nakuti anak.

═══════════════════════════════════════
TUGAS:
Buatkan konten "${typeLabel}" dengan judul: "${title}"
Target pembaca: anak usia ${ageLabel}${povText}
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
2. 💬 DIALOG — simulasi bagaimana orangtua menjelaskan ke anak (dialog)
3. 📖 DALIL — landasan dari Al-Quran/Hadits (dalil)
4. 🧩 ANALOGI — perumpamaan dari kehidupan anak (analogy)
5. 📝 ISI KONTEN — penjelasan tambahan jika perlu detail lebih (paragraph)
6. ℹ️ TIPS — panduan praktis untuk orangtua (tip)
7. ✨ HIKMAH — refleksi penutup (hikmah)
8. 🤲 DOA — doa relevan (doa)

KUNCI ALUR: Setiap blok harus TERASA SAMBUNGAN dari blok sebelumnya.
Dialog menjelaskan jawaban instan. Dalil memperkuat dialog. Analogi menyederhanakan dalil. Tips mengaplikasikan semuanya.

💡 BLOK: JAWABAN INSTAN (quick_answer)
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

KUNCI: Setiap blok harus menjawab "lalu apa?" dari blok sebelumnya — sehingga terasa satu alur yang mengalir.

⚠️ PERSPEKTIF AUDIO: Konten ini akan DIBACAKAN kepada anak via TTS.
Tulis seperti guru yang sedang bercerita di kelas — bukan menulis diktat.
Sapa anak langsung: "Teman-teman...", "Coba bayangkan...", "Keren ya?"
Pastikan kalimat mengalir natural ketika didengarkan, bukan hanya enak dibaca.

📝 BLOK: ISI KONTEN (paragraph)
Gunakan bahasa yang mudah dipahami anak. Buka dengan HOOK terlebih dulu, lalu penjelasan inti, lalu langkah praktik.

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
- Sumber yang JELAS (contoh: QS. Al-Baqarah: 43, HR. Bukhari No. 8, HR. Muslim No. 16)

Format yang harus kamu ikuti:
---
DALIL:
Dalil 1:
  Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
  Terjemahan: "Sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman."
  Sumber: QS. An-Nisa: 103
  Sumber URL: https://quran.com/4/103

Dalil 2:
  Arab: (jika ada)
  Terjemahan: "..."
  Sumber: HR. Bukhari No. 8
  Sumber URL: https://www.hadits.id/hadits/bukhari/8
---

⚠️ PANDUAN URL SUMBER WAJIB DIBACA:
- Al-Quran: format URL = https://quran.com/[nomor-surah]/[nomor-ayat]
  Contoh: QS. An-Nisa: 103 → https://quran.com/4/103 | QS. Al-Baqarah: 255 → https://quran.com/2/255
- Hadits: format URL = https://www.hadits.id/hadits/[nama-kitab]/[nomor]
  Contoh: HR. Bukhari No. 8 → https://www.hadits.id/hadits/bukhari/8
- 🛑 LARANGAN KERAS: JANGAN MENGARANG atau MENEBAK URL.
  Jika tidak 100% yakin URL-nya benar, KOSONGKAN field "Sumber URL" — cukup isi "Sumber" teks saja.

🧩 BLOK: ANALOGI KONTEKSTUAL (analogy)
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

ℹ️ BLOK: TIPS ORANG TUA (tip)
Tips praktis untuk orang tua dalam menjelaskan topik ini ke anak di rumah.

Format:
---
TIPS:
"Ajak anak sholat bersama sejak usia 7 tahun dengan lembut, tanpa memaksa."
---

✨ BLOK: HIKMAH / PELAJARAN (hikmah)
Pelajaran utama atau refleksi mendalam dari topik ini.
Tulis 1–3 poin hikmah yang menyentuh hati dan relevan dengan kehidupan anak/orang tua.
Gunakan bahasa yang reflektif, hangat, dan memotivasi — BUKAN menggurui.

Format:
---
HIKMAH:
"Dari pembahasan ini kita belajar bahwa..."
---

🤲 BLOK: DOA (doa)
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
Sumber URL: https://quran.com/20/114
---

⚠️ PANDUAN URL SUMBER DOA:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat] | Contoh: QS. Thaha: 114 → https://quran.com/20/114
- Hadits: https://www.hadits.id/hadits/[nama-kitab]/[nomor]
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".

`;

    // Age-specific detailed guidelines
    prompt += `═══ PANDUAN PENYESUAIAN USIA ═══\n`;
    if (ages.includes('3-5')) prompt += `- Usia 3-5 tahun: Gunakan kalimat SANGAT sederhana (3-5 kata per kalimat). Analogi dari mainan, hewan, makanan kesukaan anak. Dialog sangat pendek dan lucu.\n`;
    if (ages.includes('5-7')) prompt += `- Usia 5-7 tahun: Gunakan kalimat sederhana. Analogi dari sekolah, teman, keluarga. Boleh sedikit lebih panjang.\n`;
    if (ages.includes('7-10')) prompt += `- Usia 7-10 tahun: Boleh lebih detail. Analogi dari kehidupan sehari-hari. Anak sudah bisa memahami konsep sebab-akibat.\n`;
    if (ages.includes('10-13')) prompt += `- Usia 10-13 tahun: Bisa lebih kompleks dan mendalam. Boleh sertakan penjelasan ilmiah sederhana. Anak sudah bisa berpikir kritis.\n`;
    if (ages.includes('Semua Usia') || ages.length === 0) prompt += `- Semua usia: Gunakan bahasa yang universal, mudah dipahami semua kalangan usia anak.\n`;

    // Intellectual Persona Framework (Thinker)
    prompt += this.generateIntellectualFramework(selectedThinkers, false);

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

  private generateKisahPrompt(subType: string, title: string, selectedThinkers: string[]): string {
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
Susun konten menggunakan blok-blok berikut. Setiap blok HARUS diisi dengan baik.

━━━ 📝 BLOK 1: ISI KONTEN (paragraph + heading) — WAJIB PANJANG & MENGALIR ━━━
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
${subType !== 'FIKSI' ? 'Sisipkan dialog bersumber dari riwayat dalam narasi jika ada.' : 'Sisipkan dialog antar tokoh yang membuat cerita hidup.'}
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

`;

    if (subType !== 'FIKSI') {
      prompt += `━━━ 📖 BLOK 2: DALIL / LANDASAN (dalil) ━━━
Cantumkan 1–2 ayat Al-Quran atau Hadits Shahih yang paling relevan dengan tema kisah.
Format per dalil:
• Arabic  : [teks arab]
• Terjemah: [terjemahan bahasa Indonesia]
• Sumber  : [nama surah + ayat, atau kitab hadits + nomor]
• Sumber URL: [URL sumber — panduan di bawah]

⚠️ PANDUAN URL SUMBER:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat] | Contoh: QS. Al-Baqarah:260 → https://quran.com/2/260
- Hadits: https://www.hadits.id/hadits/[kitab]/[nomor] | Contoh: HR. Bukhari No. 1234 → https://www.hadits.id/hadits/bukhari/1234
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".
Tempatkan di posisi paling bermakna (sebelum klimaks atau setelah narasi utama).

`;
    }

    prompt += `━━━ 🧩 BLOK ANALOGI ORGANIK (analogy) ━━━
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
• Penjelasan: [2–3 kalimat, menggunakan benda/situasi dari kisah itu sendiri]

`;

    const tipBlockNr = subType !== 'FIKSI' ? '4' : '2';
    prompt += `━━━ ℹ️ BLOK ${tipBlockNr}: CATATAN / TIPS (tip) ━━━
Tips WAJIB merupakan REFLEKSI NATURAL dari momen spesifik yang terjadi dalam kisah di atas.
Setiap tips harus bisa dijawab: "Di bagian mana kisah ini poin ini muncul?"

❌ SALAH: Tips generik yang bisa ditulis tanpa membaca kisah sama sekali.
✅ BENAR: Tips yang hanya masuk akal setelah membaca kisah di atas.

Tulis 3–4 poin, hangat dan memotivasi — BUKAN ceramah.
Format per poin:
• 💡 [poin hikmah + referensi ke momen kisah]
   Contoh: "Seperti [tokoh] yang [momen dari kisah], ajak anak..."

`;

    if ((subType === 'SIRAH' || subType === 'QASHASH' || subType === 'TELADAN')) {
      prompt += `━━━ 📚 REFERENSI SUMBER (dalil — tipe referensi) ━━━
Cantumkan sumber kitab utama rujukan kisah ini.
Format:
• Kitab  : [judul kitab]
• Penulis: [nama ulama pengarang]
• Hal./No.: [nomor halaman atau hadits]

`;
    }

    // Hikmah block
    prompt += `━━━ ✨ BLOK HIKMAH / PELAJARAN (hikmah) ━━━
Pelajaran utama yang dapat dipetik dari kisah ini.
Tulis hikmah yang menyentuh hati, relevan bagi anak, dan menginspirasi kebaikan.
Gunakan nada hangat dan penuh harapan — bukan menggurui.
Format:
• Hikmah: [1–3 paragraf refleksi yang bermakna]

`;

    // Doa block — separate for fiksi vs non-fiksi
    if (subType !== 'FIKSI') {
      prompt += `━━━ 🤲 BLOK DOA (doa) ━━━
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
• Sumber: [QS. ... atau HR. Bukhari/Muslim No. ...]
• Sumber URL: [URL sumber]
  - Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat]
  - Hadits: https://www.hadits.id/hadits/[kitab]/[nomor]
  - 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field ini.

`;
    } else {
      prompt += `━━━ 🤲 BLOK DOA (doa) — Opsional ━━━
Boleh menyisipkan doa sederhana dalam narasi cerita.
Jika ingin mencantumkan doa spesifik dengan sumber, WAJIB dari Al-Quran/Hadits Shahih saja.
Format (jika digunakan):
• Judul : [nama doa singkat]
• Arab  : [teks arab doa]
• Terjemah: [terjemahan]
• Sumber: [sumber shahih]
• Sumber URL: [URL jika tersedia — JANGAN mengarang URL]

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
❌ JANGAN menggurui atau berceramah langsung`;

    // Intellectual Persona Framework (Thinker) for Kisah
    prompt += this.generateIntellectualFramework(selectedThinkers, true);

    prompt += `
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

  // ═══════════════════════════════════════════════
  // Intellectual Persona Framework Generator
  // (mirrors frontend generateIntellectualFramework)
  // ═══════════════════════════════════════════════

  private generateIntellectualFramework(selectedIds: string[], forKisah = false): string {
    const THINKERS: Record<string, { name: string; detail: string }> = {
      aristotle: { name: 'Aristotle', detail: 'Bangun setiap argumen dengan logika sebab-akibat yang solid dan kategorisasi yang jelas. Gunakan struktur silogisme: premis besar → premis kecil → kesimpulan.' },
      descartes: { name: 'René Descartes', detail: 'Mulai dari pertanyaan paling mendasar sebelum membangun penjelasan. Ragukan asumsi umum, lalu bangun argumen dari fondasi yang paling fundamental.' },
      musk: { name: 'Elon Musk', detail: 'Pecah masalah ke elemen paling dasar, singkirkan asumsi konvensional, lalu bangun ulang solusi dari fondasi logis yang benar.' },
      feynman: { name: 'Richard Feynman', detail: 'Sederhanakan konsep serumit apapun sehingga bisa dipahami oleh anak kelas 1 SD. Gunakan analogi konkret dari benda atau pengalaman sehari-hari yang dekat dengan anak.' },
      sagan: { name: 'Carl Sagan', detail: 'Gunakan perumpamaan dari skala luas (alam semesta, waktu, kehidupan) untuk memberi perspektif yang mengagumkan. Buat pembaca merasa kecil namun bermakna.' },
      suntzu: { name: 'Sun Tzu', detail: 'Susun argumen secara strategis. Antisipasi keberatan pembaca sebelum muncul. Identifikasi leverage point dan sampaikan pesan pada momen yang paling efektif.' },
      thiel: { name: 'Peter Thiel', detail: "Temukan sudut pandang yang mengejutkan dan berlawanan dari asumsi mayoritas. Pertanyakan 'apa yang semua orang percaya tapi salah?' dalam topik ini." },
      grove: { name: 'Andrew Grove', detail: 'Identifikasi momen perubahan kritis dalam topik. Bangun solusi yang scalable dan tahan terhadap tekanan. Fokus pada eksekusi dan hasil nyata.' },
      anies: { name: 'Anies Baswedan', detail: 'Susun narasi yang menyentuh hati, dekat kehidupan sehari-hari, dan mudah dipahami semua kalangan. Mulai dengan konteks yang relatable, bangun emosi, akhiri dengan harapan.' },
      nadiem: { name: 'Nadiem Makarim', detail: 'Dekati pembelajaran dengan cara yang segar dan membebaskan. Fokus pada kebutuhan nyata anak sebagai subjek belajar, bukan objek. Gunakan pendekatan project-based dan kontekstual.' },
      gladwell: { name: 'Malcolm Gladwell', detail: 'Bangun narasi melalui anekdot yang kuat dan insight mengejutkan dari observasi perilaku manusia. Mulai dengan cerita kecil yang konkret, lalu tarik ke pelajaran universal yang besar.' },
    };

    const chosen = selectedIds.map(id => THINKERS[id]).filter(Boolean);
    if (chosen.length === 0) return '';

    let section = `\n\n══════════════════════════════════════════
KERANGKA BERPIKIR (INTELLECTUAL PERSONA)
══════════════════════════════════════════
Gunakan STRUKTUR BERPIKIR dari tokoh-tokoh berikut — bukan gaya bahasa atau kepribadiannya:\n\n`;

    chosen.forEach(t => {
      section += `• ${t.name} → ${t.detail}\n`;
    });

    section += `\nCatatan Penting: Gabungkan framework ini menjadi reasoning yang seimbang dan saling melengkapi. Ambil logika dan cara berpikir mereka — BUKAN cara berbicara atau kepribadiannya.`;

    if (forKisah) {
      section += `\n⚠️ Untuk Kisah: Terapkan hanya pada struktur narasi, plot, kualitas analogi, dan penyajian hikmah. JANGAN gunakan untuk menambah atau memodifikasi fakta sejarah. Aturan sumber Sirah/Qashash/Teladan tetap berlaku penuh.`;
    }

    return section;
  }
}
