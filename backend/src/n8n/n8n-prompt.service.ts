import { PrismaService } from '../prisma/prisma.service';
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
  nodeId?: string;
  ageGroups?: string[];
  selectedThinkers?: string[];
  pov?: string; // 'ORTU' | 'ANAK' — only for ARTICLE type
}

export interface GenerateThumbPromptDto {
  title: string;
  ratio: '16:9' | '1:1' | '4:5';
  style?: string;
  scenePreset?: 'KELUARGA' | 'NABI_SAHABAT' | 'KELOMPOK_ANAK' | 'TUNGGAL' | 'TANPA_MAKHLUK';
  category?: 'QNA' | 'KISAH' | 'PEMBELAJARAN' | 'ARTIKEL';
}

@Injectable()
export class N8nPromptService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════
  // Content Prompt Generator
  // ═══════════════════════════════════════════════

  async generatePrompt(dto: GeneratePromptDto): Promise<string> {
    const { type, title, ageGroups, selectedThinkers, pov, nodeId } = dto;
    // Resolve nodeId → subType (priority: explicit subType > nodeId resolution)
    let subType = dto.subType;
    if (!subType && nodeId) {
      subType = await this.resolveNodeToSubType(nodeId) as any;
    }
    if (type === 'KISAH') {
      // Map 'FIKSI' (bot enum) → 'CERITA_FIKSI' (frontend enum) untuk konsistensi internal
      const kisahSubType = subType === 'FIKSI' ? 'CERITA_FIKSI' : (subType || 'SIRAH');
      return this.generateKisahPrompt(kisahSubType, title, selectedThinkers || []);
    }
    return this.generateContentPrompt(type, title, ageGroups || ['3-5', '5-7', '7-10'], selectedThinkers || [], pov || '');
  }

  // ═══════════════════════════════════════════════
  // Thumbnail Prompt Generator
  // ═══════════════════════════════════════════════

  generateThumbnailPrompt(dto: GenerateThumbPromptDto): string {
    const { title, ratio, style, scenePreset, category } = dto;
    const sizeMap: Record<string, string> = { '16:9': '1280×720', '1:1': '1080×1080', '4:5': '1080×1350' };
    const arLabel = ratio === '16:9' ? 'Widescreen 16:9' : ratio === '1:1' ? 'Square 1:1' : 'Portrait 4:5';
    const visualStyle = style || 'Animasi 3D (Pixar/Disney)';
    const scene = scenePreset || 'KELUARGA';

    // Build character spec based on scene preset (mirrors frontend buildCharacterSpec)
    const faceless = 'WAJIB FACELESS — TIDAK ADA fitur wajah (mata/hidung/mulut) — wajah harus kosong/blank';
    const facelessEn = 'STRICTLY FACELESS — NO facial features (no eyes, no nose, no mouth) — completely blank faces';

    let charSpecId: string;
    let charSpecEn: string;

    switch (scene) {
      case 'TANPA_MAKHLUK':
        charSpecId = 'TANPA makhluk bernyawa. Fokus pada: arsitektur islami (masjid/menara), pemandangan alam (awan/bintang/bulan), benda islami (Al-Quran/tasbih/lentera), atau motif geometris islami.';
        charSpecEn = 'No living beings. Focus on Islamic architecture, natural scenery, Islamic objects (Quran, prayer beads, lantern), or geometric Islamic art patterns.';
        break;
      case 'NABI_SAHABAT':
        charSpecId = `Representasikan Nabi sebagai SILUET BERCAHAYA saja — dikelilingi nur/cahaya emas lembut. DILARANG KERAS: fitur wajah, detail tubuh. Hanya siluet jubah putih bersinar. Cahaya nur HARUS mendominasi.`;
        charSpecEn = `Represent the Prophet as a LUMINOUS SILHOUETTE ONLY surrounded by soft golden radiant aura (nur). STRICTLY FORBIDDEN: facial features, body details. Only glowing white-clothed outline.`;
        break;
      case 'KELOMPOK_ANAK':
        charSpecId = `2-3 anak muslim (laki-laki berpeci dan perempuan berhijab), semua ${faceless}.`;
        charSpecEn = `2-3 Muslim children (boys with kufi, girls with hijab), all ${facelessEn}.`;
        break;
      case 'TUNGGAL':
        charSpecId = `Seorang anak muslim ${faceless}, mengenakan pakaian islami.`;
        charSpecEn = `A single Muslim child, ${facelessEn}, wearing Islamic clothing.`;
        break;
      case 'KELUARGA':
      default:
        charSpecId = `Keluarga muslim — ayah berjenggot (koko/jubah), ibu berhijab syar'i panjang. Semua ${faceless}.`;
        charSpecEn = `Muslim family — father with beard (Islamic clothing), mother with long hijab. All ${facelessEn}.`;
        break;
    }

    let prompt = `Tolong buatkan gambar (image generation) untuk thumbnail konten edukasi anak Islami.

Konteks Judul: "${title}"

Spesifikasi Wajib:
- Gaya Visual: ${visualStyle}
- Nuansa: Ramah anak, warna-warni ceria, pencahayaan hangat (warm lighting)
- Aspek Rasio: ${arLabel} (Sangat Penting!)
- Resolusi Target: ${sizeMap[ratio]}
- ${charSpecId}
- ATURAN KETAT: TIDAK BOLEH ADA TEKS, HURUF, ATAU TULISAN APAPUN. Sediakan Negative Space untuk penambahan teks manual.
- BRANDING (sudut KIRI ATAS gambar, disusun vertikal dari atas ke bawah):
  Baris 1: "${this.getCategoryLabel(category)}" — font sama seperti judul, ukuran 50% dari ukuran judul, semi-transparan (opacity 50-70%)
  Baris 2: "Adably.id" — font sama seperti judul, ukuran 50% dari ukuran judul, semi-transparan (opacity 50-70%)
  Baris 3: "Platform Edukasi Anak Islami" — ukuran lebih kecil dari Adably.id (sekitar 30-40% dari judul), semi-transparan
  Warna: putih dengan shadow halus agar terbaca di semua latar belakang.`;

    if (ratio !== '16:9') {
      prompt += `\n\n⚠️ PENTING — ASPEK RASIO ${arLabel}:\nKomposisi gambar HARUS sesuai ${ratio}. ${ratio === '1:1' ? 'Gambar harus persegi sempurna — tidak boleh landscape.' : 'Gambar harus portrait/tegak — tidak boleh landscape.'}\nPastikan elemen visual terpusat dan seimbang untuk format ${ratio}.`;
    }

    const categoryEn = this.getCategoryLabel(category);
    prompt += `\n\n(English reference for AI engine):\n"Islamic kids education thumbnail: ${title}. Style: ${visualStyle}. ${charSpecEn}. Warm lighting, vibrant child-friendly colors. Resolution: ${sizeMap[ratio]}. NO TEXT, NO LETTERS, negative space for manual text. Top-left corner branding: '${categoryEn}' + 'Adably.id' + 'Platform Edukasi Anak Islami' in white semi-transparent text with subtle shadow. --ar ${ratio}"`;

    return prompt;
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
2. 📝 ISI KONTEN — penjelasan lebih detail (paragraph)
3. 💬 DIALOG — simulasi bagaimana orangtua menjelaskan ke anak (dialog)
4. 🧩 ANALOGI — perumpamaan dari kehidupan anak (analogy)
5. ✨ HIKMAH — refleksi dan pelajaran (hikmah)
6. 🤲 DOA — doa relevan (doa)
7. ℹ️ TIPS — panduan praktis untuk orangtua (tip)
8. 📖 DALIL — landasan dari Al-Quran/Hadits (dalil)

KUNCI ALUR: Setiap blok harus TERASA SAMBUNGAN dari blok sebelumnya.
Jawaban instan memberi gambaran cepat. Isi konten menjelaskan lebih detail. Dialog menghidupkan penjelasan. Analogi menyederhanakan konsep. Hikmah merefleksikan pelajaran. Doa menghubungkan ke Allah. Tips memberi panduan praktis. Dalil memperkuat landasan di akhir.

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
3. 🧩 ANALOGI — buat konsep lebih mudah dimengerti (analogy)
4. ✨ HIKMAH — refleksi mengapa ini penting (hikmah)
5. 📝 PRAKTIK — langkah konkret yang bisa dilakukan anak (paragraph)
6. 🤲 DOA — doa yang relevan (doa)
7. ℹ️ TIPS — panduan untuk orang tua (tip)
8. 📖 DALIL — tunjukkan landasannya dari Al-Quran/Hadits (dalil)

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

    // Common blocks — Order: Analogi → Hikmah → Doa → Tips → Dalil
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
Sumber: Quran Surah Thaha ayat 114
Sumber URL: https://quran.com/20/114
---

⚠️ PANDUAN URL SUMBER DOA:
- Al-Quran: https://quran.com/[nomor-surah]/[nomor-ayat] | Contoh: Quran Surah Thaha ayat 114 → https://quran.com/20/114
- Hadits: https://www.hadits.id/hadits/[nama-kitab]/[nomor]
- 🛑 JANGAN mengarang URL. Jika tidak yakin, KOSONGKAN field "Sumber URL".

ℹ️ BLOK: TIPS ORANG TUA (tip)
Tips praktis untuk orang tua dalam menjelaskan topik ini ke anak di rumah.

Format:
---
TIPS:
"Ajak anak sholat bersama sejak usia 7 tahun dengan lembut, tanpa memaksa."
---

📖 BLOK: DALIL/LANDASAN (dalil)
Sumber hukum Islam yang relevan. PENTING: Dalam 1 blok dalil bisa ada BANYAK sumber dalil sekaligus. Setiap dalil berisi:
- Teks Arab (jika tersedia)
- Terjemahan / isi dalil dalam Bahasa Indonesia
- Sumber yang JELAS (contoh: Quran Surah Al-Baqarah ayat 43, Hadits Riwayat Bukhari Nomor 8, Hadits Riwayat Muslim Nomor 16)

Format yang harus kamu ikuti:
---
DALIL:
Dalil 1:
  Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
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

Tulis salam pembuka yang hangat, branded, dan relevan dengan topik.
Gunakan format ini sebagai TEMPLATE (sesuaikan dengan topik):

"Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably!
Apa kabar hari ini? Semoga teman-teman semua selalu dalam lindungan Allah ya.
Hari ini, kita akan [belajar tentang/membahas/bercerita tentang] [topik].
[1 kalimat penggugah rasa ingin tahu yang relevan dengan judul]"

ATURAN:
- WAJIB awali dengan "Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably!"
- Sapa anak dengan hangat: "teman-teman", "sahabat Adably"
- Berikan 1 kalimat pengantar yang membuat anak PENASARAN tentang topik
- Nada: hangat, ceria, penuh semangat — seperti kakak yang menyapa adiknya

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini akan disimpan di field "Penutupan".

Tulis penutup yang menginspirasi DAN mengandung CTA (call-to-action) untuk platform.
Gunakan format ini sebagai TEMPLATE (sesuaikan dengan topik):

"Nah, itulah [rangkuman topik dalam 1 kalimat].
[1 kalimat hikmah/motivasi yang menyentuh hati]

Kalau teman-teman suka dengan konten ini, jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru!

Sampai jumpa di konten berikutnya ya, sahabat Adably!
Wallahu a'lam bishawab.
Wassalamualaikum warahmatullahi wabarakatuh."

ATURAN:
- Rangkum pelajaran utama dalam 1-2 kalimat SEBELUM CTA
- WAJIB sertakan CTA: "jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru!"
- Gunakan sapaan perpisahan: "Sampai jumpa di konten berikutnya ya, sahabat Adably!"
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"

════════════════════════════════════════
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
   Sumber URL: [https://quran.com/surah/ayat ATAU https://www.hadits.id/hadits/kitab/nomor — KOSONGKAN jika tidak 100% yakin]

5. Format WAJIB untuk blok (doa) — ikuti PERSIS:
   (doa)
   Judul: [nama doa singkat]
   Arab: [teks arab doa]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
   Sumber URL: [https://quran.com/... atau https://www.hadits.id/... — KOSONGKAN jika tidak 100% yakin]

Contoh output yang BENAR:
---
Judul: Mengapa Kita Harus Sholat?
Deskripsi: Penjelasan kewajiban sholat untuk anak muslim.
Usia: 5-7, 7-10
Tag: sholat, ibadah, anak, wajib

(opening)
Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably! Apa kabar hari ini? Semoga teman-teman selalu dalam lindungan Allah ya. Hari ini kita akan belajar tentang sholat...

(quick_answer)
Sholat adalah kewajiban setiap muslim yang sudah baligh...

(dalil)
Dalil 1:
Arab: إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا
Terjemahan: Sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman.
Sumber: Quran Surah An-Nisa ayat 103
Sumber URL: https://quran.com/4/103

Dalil 2:
Arab: (jika ada)
Terjemahan: ...
Sumber: Hadits Riwayat Bukhari Nomor 8
Sumber URL: https://www.hadits.id/hadits/bukhari/8

(doa)
Judul: Doa Memohon Keistiqomahan
Arab: رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا
Terjemahan: Ya Tuhan kami, janganlah Engkau jadikan hati kami condong kepada kesesatan setelah Engkau beri petunjuk kepada kami.
Sumber: Quran Surah Ali Imran ayat 8
Sumber URL: https://quran.com/3/8

(closing)
Nah, itulah pentingnya sholat dalam kehidupan kita. Semoga kita semua bisa istiqomah ya! Kalau teman-teman suka dengan konten ini, jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru! Sampai jumpa di konten berikutnya ya, sahabat Adably! Wallahu a'lam bishawab. Wassalamualaikum warahmatullahi wabarakatuh.
---
════════════════════════════════════════`;

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
${subType !== 'CERITA_FIKSI' ? 'Sisipkan dialog bersumber dari riwayat dalam narasi jika ada.' : 'Sisipkan dialog antar tokoh yang membuat cerita hidup.'}
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

    if (subType !== 'CERITA_FIKSI') {
      prompt += `━━━ 📖 BLOK 2: DALIL / LANDASAN (dalil) ━━━
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

    const tipBlockNr = subType !== 'CERITA_FIKSI' ? '4' : '2';
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

    if (subType === 'SIRAH' || subType === 'QASHASH' || subType === 'TELADAN') {
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
    if (subType !== 'CERITA_FIKSI') {
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
• Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
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

Tulis salam pembuka yang hangat, branded, dan relevan dengan tema kisah.
Gunakan format ini sebagai TEMPLATE (sesuaikan dengan kisah):

"Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably!
Apa kabar hari ini? Semoga teman-teman semua selalu dalam lindungan Allah ya.
Hari ini, kita akan mendengarkan kisah yang [sangat menarik/luar biasa/mengharukan] tentang [topik kisah].
Siap? Yuk kita mulai!"

ATURAN:
- WAJIB awali dengan "Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably!"
- Sapa anak dengan hangat: "teman-teman", "sahabat Adably"
- Berikan teaser singkat yang membuat anak PENASARAN tentang kisah
- Nada: hangat, ceria, penuh semangat

━━━ 🤲 PENUTUPAN (closing) ━━━
⚠️ INI BUKAN BLOK KONTEN. Teks ini disimpan di field "Penutupan".

Tulis penutup yang menyentuh, menginspirasi, DAN mengandung CTA untuk platform.
Gunakan format ini sebagai TEMPLATE (sesuaikan dengan kisah):

"Nah, itulah kisah [rangkuman 1 kalimat].
[1 kalimat hikmah yang menyentuh hati]

Kalau teman-teman suka dengan kisah ini, jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru!

Sampai jumpa di kisah berikutnya ya, sahabat Adably!
Wallahu a'lam bishawab.
Wassalamualaikum warahmatullahi wabarakatuh."

ATURAN:
- Rangkum pelajaran utama kisah dalam 1-2 kalimat SEBELUM CTA
- WAJIB sertakan CTA: "jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru!"
- Gunakan sapaan perpisahan: "Sampai jumpa di kisah berikutnya ya, sahabat Adably!"
- Akhiri dengan "Wallahu a'lam bishawab" dan "Wassalamualaikum warahmatullahi wabarakatuh"

════════════════════════════════════════
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
   Sumber URL: [https://quran.com/surah/ayat ATAU https://www.hadits.id/hadits/kitab/nomor — KOSONGKAN jika tidak 100% yakin]

5. Format WAJIB untuk blok (doa):
   (doa)
   Judul: [nama doa singkat]
   Arab: [teks arab doa]
   Terjemahan: [terjemahan bahasa Indonesia]
   Sumber: [Quran Surah ... ayat ... atau Hadits Riwayat Bukhari/Muslim Nomor ...]
   Sumber URL: [https://quran.com/... atau https://www.hadits.id/... — KOSONGKAN jika tidak 100% yakin]

Contoh output yang BENAR:
---
Judul: Kisah Nabi Ibrahim dan Api
Deskripsi: Kisah keberanian Nabi Ibrahim yang tidak terbakar api.
Usia: 3-10
Tag: nabi ibrahim, sabar, tawakal, api, mukjizat

(opening)
Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably! Apa kabar hari ini? Semoga teman-teman selalu dalam lindungan Allah ya. Hari ini kita akan mendengarkan kisah yang luar biasa tentang keberanian Nabi Ibrahim. Siap? Yuk kita mulai!

(paragraph)
Langit masih gelap ketika sebuah keputusan mengubah segalanya...

(heading)
Ujian yang Berat

(paragraph)
Nabi Ibrahim berdiri tegak di hadapan api yang menyala-nyala...

(dalil)
Dalil 1:
Arab: قُلْنَا يَا نَارُ كُونِي بَرْدًا وَسَلَامًا عَلَىٰ إِبْرَاهِيمَ
Terjemahan: Kami berfirman, Wahai api! Jadilah kamu dingin dan penyelamat bagi Ibrahim.
Sumber: Quran Surah Al-Anbiya ayat 69
Sumber URL: https://quran.com/21/69

(doa)
Judul: Doa Memohon Perlindungan
Arab: حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ
Terjemahan: Cukuplah Allah bagi kami dan Dia adalah sebaik-baik pelindung.
Sumber: Quran Surah Ali Imran ayat 173
Sumber URL: https://quran.com/3/173

(closing)
Nah, itulah kisah tentang keberanian Nabi Ibrahim yang luar biasa. Betapa kuatnya beliau karena yakin kepada Allah! Kalau teman-teman suka dengan kisah ini, jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru! Sampai jumpa di kisah berikutnya ya, sahabat Adably! Wallahu a'lam bishawab. Wassalamualaikum warahmatullahi wabarakatuh.
---
════════════════════════════════════════`;

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

  /**
   * Map category enum to Indonesian label for thumbnail branding
   */
  private getCategoryLabel(category?: string): string {
    const labels: Record<string, string> = {
      QNA: '❓ Tanya Jawab',
      KISAH: '📖 Kisah Islami',
      PEMBELAJARAN: '📚 Pembelajaran',
      ARTIKEL: '📝 Artikel',
    };
    return labels[category || ''] || '📚 Adably';
  }

  /**
   * Resolve nodeId → subType for prompt generation
   * Maps node title to known prompt styles (SIRAH, QASHASH, TELADAN, CERITA_FIKSI)
   */
  async resolveNodeToSubType(nodeId?: string): Promise<string> {
    if (!nodeId) return 'SIRAH'; // default
    try {
      const node = await this.prisma.contentNode.findUnique({ where: { id: nodeId } });
      if (!node) return 'SIRAH';
      const title = node.title.toLowerCase();
      if (title.includes('sirah') || title.includes('nabawiyah') || title.includes('nabi muhammad')) return 'SIRAH';
      if (title.includes('qashash') || title.includes('anbiya') || title.includes('para nabi')) return 'QASHASH';
      if (title.includes('teladan') || title.includes('sahabat') || title.includes('ulama')) return 'TELADAN';
      if (title.includes('fiksi') || title.includes('cerita') || title.includes('modern')) return 'CERITA_FIKSI';
      return 'SIRAH'; // fallback
    } catch {
      return 'SIRAH';
    }
  }

  // ═══════════════════════════════════════════════
  // Storyboard Scene Prompt Generator
  // Converts content script → visual scenes for video
  // ═══════════════════════════════════════════════

  generateStoryboardScenePrompt(dto: {
    title: string;
    script: string;
    category?: string;
    aspectRatio?: '16:9' | '9:16' | '1:1';
    targetScenes?: number;
  }): string {
    const { title, script, category, aspectRatio, targetScenes } = dto;
    const ratio = aspectRatio || '16:9';
    const sceneCount = targetScenes || 8;
    const categoryLabel = this.getCategoryLabel(category);

    return `Kamu adalah AI SUTRADARA VISUAL untuk platform edukasi anak Islami "Adably".
Tugasmu: Konversikan naskah konten teks menjadi BREAKDOWN SCENE VISUAL untuk video storyboard.

══════════════════════════════════════════
KONTEKS
══════════════════════════════════════════
Judul: "${title}"
Kategori: ${categoryLabel}
Aspek Rasio: ${ratio}
Target Jumlah Scene: ${sceneCount} scenes (termasuk opening + closing)

══════════════════════════════════════════
NASKAH KONTEN (SCRIPT)
══════════════════════════════════════════
${script}

══════════════════════════════════════════
INSTRUKSI KONVERSI SCENE
══════════════════════════════════════════

ATURAN WAJIB:
1. Scene PERTAMA (Scene 1) adalah MUKADIMAH / OPENING:
   - Visual: Latar Islami yang indah (masjid, langit sunrise, taman) dengan teks branding "Adably.id"
   - Subtitle: "Assalamualaikum warahmatullahi wabarakatuh, sahabat Adably!"
   - Durasi: 5-7 detik
   - Transisi: fade

2. Scene TERAKHIR (Scene ${sceneCount}) adalah CLOSING / PENUTUP:
   - Visual: Latar yang hangat dan damai (sunset, masjid, bintang)
   - Subtitle harus mengandung CTA:
     "Jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru! Sampai jumpa di konten berikutnya ya, sahabat Adably! Wassalamualaikum warahmatullahi wabarakatuh."
   - Durasi: 8-10 detik
   - Transisi: fade

3. Scene 2 hingga ${sceneCount - 1} adalah ISI KONTEN:
   - Pecah naskah menjadi ${sceneCount - 2} scene visual yang logis
   - Setiap scene = 1 momen/konsep/adegan
   - Subtitle = rangkuman narasi yang dibacakan untuk scene tersebut (maks 2 kalimat)

PANDUAN VISUAL:
- Gaya: Animasi 3D Pixar/Disney, ramah anak, warna-warni ceria
- Karakter: FACELESS (tanpa fitur wajah) — sesuai aturan Islami
- Pencahayaan: Warm lighting, golden hour
- Setting: Sesuaikan dengan konteks naskah (rumah muslim, masjid, taman, sekolah)
- DILARANG: Gambar makhluk hidup dengan wajah, konten menakutkan, elemen non-Islami

KONSISTENSI KARAKTER:
- Jika ada karakter (anak, ayah, ibu), gunakan DESKRIPSI VISUAL IDENTIK di setiap scene:
  • Anak laki-laki: "anak laki-laki berpeci putih, baju koko hijau"
  • Anak perempuan: "anak perempuan berhijab pink, gamis putih"
  • Ayah: "ayah berjenggot, jubah putih, sorban"
  • Ibu: "ibu berhijab syar'i biru tua, gamis coklat muda"
- Gunakan deskripsi yang SAMA PERSIS di setiap scene agar konsisten

══════════════════════════════════════════
FORMAT OUTPUT — WAJIB DIIKUTI
══════════════════════════════════════════

Output dalam format JSON array. Setiap scene:
{
  "scenes": [
    {
      "sceneNumber": 1,
      "label": "Opening / Mukadimah",
      "imagePrompt": "[deskripsi visual lengkap untuk AI image generator, dalam Bahasa Inggris, termasuk style, lighting, composition, NO text/letters]",
      "subtitle": "[teks narasi yang dibacakan untuk scene ini, dalam Bahasa Indonesia]",
      "duration": 6,
      "transition": "fade"
    },
    {
      "sceneNumber": 2,
      "label": "[nama scene]",
      "imagePrompt": "[deskripsi visual]",
      "subtitle": "[narasi]",
      "duration": 5,
      "transition": "fade"
    },
    ...
    {
      "sceneNumber": ${sceneCount},
      "label": "Closing / Penutup",
      "imagePrompt": "[deskripsi visual closing]",
      "subtitle": "Jangan lupa kunjungi channel YouTube kami dan website resmi kami di adably.id untuk mendengarkan lebih banyak kisah, cerita, dan pelajaran Islam yang seru! Sampai jumpa di konten berikutnya ya, sahabat Adably! Wassalamualaikum warahmatullahi wabarakatuh.",
      "duration": 10,
      "transition": "fade"
    }
  ]
}

PANDUAN TRANSISI:
- fade (default, paling aman)
- dissolve (untuk perpindahan emosional)
- slideright/slideleft (untuk perpindahan waktu/tempat)
- zoomin (untuk momen intens/klimaks)

PANDUAN DURASI:
- Opening: 5-7 detik
- Scene isi: 4-8 detik (sesuaikan panjang subtitle)
- Closing: 8-10 detik

⚠️ PENTING:
- imagePrompt harus dalam Bahasa INGGRIS (untuk AI image generator)
- imagePrompt WAJIB menyebut "3D Pixar style, warm lighting, faceless characters, child-friendly"
- subtitle dalam Bahasa INDONESIA
- Output HANYA JSON — tanpa markdown, tanpa penjelasan
- Aspek rasio ${ratio} WAJIB disebut dalam setiap imagePrompt`;
  }

}
