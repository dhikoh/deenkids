/**
 * Generate a video script prompt or story script from Adably content.
 * KISAH type → clean narration script (Naskah Kisah)
 * Other types → YouTube video script prompt
 *
 * Features:
 * - Storytelling enchantment (hook, pacing, emotional beats)
 * - 3D Pixar/Disney faceless visual style
 * - Nabi/Rasul represented as CAHAYA (light)
 * - Non-facial emotion expression (body language, colors, effects)
 * - Category-aware prompt based on content node
 * - Aspect ratio aware (16:9 YouTube / 9:16 Shorts)
 * - YouTube AI monetization compliance
 * - Dalil only from shahih sources
 */

type AspectRatio = '16:9' | '9:16';

// ─── KISAH: Clean Narration Script ───────────────────────────────────────────

function generateKisahScript(content: any): string {
  const ageLabel = (content.ageGroups || []).join(', ') || 'semua usia';
  const nodeTitle = content.node?.title || 'Kisah Islami';

  const narasi: string[] = [];
  const referensi: string[] = [];

  for (const block of (content.articleDetail?.blocks || [])) {
    if (block.type === 'paragraph' && block.text) {
      narasi.push(block.text);
    }
    if (block.type === 'heading' && block.text) {
      narasi.push(`\n── ${block.text} ──`);
    }
    if (block.type === 'dalil') {
      const entries = block.entries || [block];
      for (const e of entries) {
        if (e.source) referensi.push(`• ${e.source}${e.translation ? ` — "${e.translation}"` : ''}`);
      }
    }
    if (block.type === 'hikmah' && block.text) {
      narasi.push(`✨ Hikmah: ${block.text}`);
    }
    if (block.type === 'doa') {
      if (block.translation) narasi.push(`🤲 Doa: "${block.translation}"`);
      if (block.source) referensi.push(`• ${block.source}`);
    }
  }

  let script =
    `╔════════════════════════════════════════╗\n` +
    `   📖 NASKAH KISAH — Adably\n` +
    `╚════════════════════════════════════════╝\n\n` +
    `Judul    : ${content.title}\n` +
    `Kategori : ${nodeTitle}\n` +
    `Usia     : ${ageLabel} tahun\n`;

  script += `\n════════════ ISI KISAH ════════════\n\n`;
  script += narasi.join('\n\n');

  if (referensi.length > 0) {
    script += `\n\n════════ REFERENSI SUMBER ════════\n`;
    script += referensi.join('\n');
  }

  script += `\n\n══════════════════════════════════\nAdably — Platform Edukasi Islami Anak`;
  return script;
}

// ─── Category-Aware Context ──────────────────────────────────────────────────

function getCategoryContext(content: any): string {
  const nodeTitle = (content.node?.title || '').toLowerCase();
  const nodeGroup = (content.node?.group || '').toUpperCase();
  const contentType = content.type;

  // KISAH group — detect sub-categories
  if (nodeGroup === 'KISAH' || contentType === 'KISAH') {
    if (nodeTitle.includes('nabi') || nodeTitle.includes('rasul')) {
      return `KONTEKS KATEGORI — KISAH NABI/RASUL:
- Setting era kenabian — padang pasir, kota Makkah/Madinah, langit malam penuh bintang.
- Karakter Nabi/Rasul WAJIB berupa CAHAYA (sinar keemasan/putih bercahaya yang agung).
  JANGAN gunakan siluet, bayangan, atau bentuk tubuh apapun untuk Nabi/Rasul.
  Representasi: berkas cahaya yang bersinar dengan kehadiran yang mulia, disertai teks nama beliau.
- Bangun narasi DRAMATIS — ada tantangan dakwah, momen ujian, mukjizat.
- Tokoh manusia lain (sahabat, kaum, musuh): siluet berjubah 3D dengan warna berbeda per karakter.
- Malaikat: representasikan sebagai cahaya putih terang atau sayap cahaya tanpa detail tubuh.`;
    }
    if (nodeTitle.includes('sahabat')) {
      return `KONTEKS KATEGORI — KISAH SAHABAT:
- Setting era sahabat — suasana perang, hijrah, dakwah, atau kehidupan Madinah.
- Karakter sahabat: siluet berjubah 3D dengan warna khas berbeda per karakter.
  Contoh: Abu Bakar = jubah putih, Umar = jubah hijau tua, Khadijah = jubah biru gelap.
- Jika menyebut Nabi ﷺ dalam narasi: representasikan sebagai CAHAYA.
- Fokus pada pengorbanan, keberanian, dan keteguhan iman para sahabat.
- Bangun momen emosional: perpisahan, perjuangan di medan perang, momen taubat.`;
    }
    if (nodeTitle.includes('teladan') || nodeTitle.includes('inspirasi')) {
      return `KONTEKS KATEGORI — KISAH TELADAN:
- Setting bisa MODERN atau KLASIK sesuai konteks cerita.
- Jika modern: lingkungan sekolah, rumah, taman bermain, masjid modern.
- Jika klasik: desa Arab, pasar tradisional, perpustakaan kuno.
- Fokus pada MORAL LESSON di akhir — buat momen "aha!" yang membekas.
- Tunjukkan transformasi karakter: dari belum tahu → belajar → berubah lebih baik.`;
    }
    // Default KISAH
    return `KONTEKS KATEGORI — KISAH ISLAMI:
- Sesuaikan setting visual dengan era dan lokasi cerita.
- Jika melibatkan Nabi/Rasul: WAJIB representasi CAHAYA.
- Bangun alur cerita yang kuat: pembuka menarik, konflik, klimaks, resolusi + hikmah.
- Karakter: siluet 3D berjubah berwarna cerah, lingkungan detail dan hidup.`;
  }

  // PEMBELAJARAN group — detect sub-categories
  if (nodeTitle.includes('aqidah') || nodeTitle.includes('tauhid')) {
    return `KONTEKS KATEGORI — AQIDAH/TAUHID:
- Gunakan METAFORA VISUAL untuk konsep abstrak.
  Contoh: Tauhid = satu cahaya terang besar di kegelapan.
  Syirik = banyak lilin kecil redup yang sia-sia dibanding satu matahari.
- Representasikan kebesaran Allah melalui alam semesta: galaksi, bintang, lautan, gunung.
- Nada naratif: penuh takjub dan kekaguman (sense of awe).
- Hindari representasi Dzat Allah dalam bentuk apapun.`;
  }
  if (nodeTitle.includes('adab') || nodeTitle.includes('akhlak')) {
    return `KONTEKS KATEGORI — ADAB/AKHLAK:
- Setting SEHARI-HARI anak — rumah, sekolah, masjid, taman bermain, pasar.
- Tunjukkan skenario BEFORE/AFTER: perilaku buruk → belajar adab → perilaku baik.
- Gunakan KONTRAS VISUAL: scene gelap/kotor saat perilaku buruk vs cerah/bersih saat baik.
- Karakter anak: siluet ceria berwarna-warni.
- Relatable untuk anak — situasi yang sering mereka alami sehari-hari.`;
  }
  if (nodeTitle.includes('fikih') || nodeTitle.includes('ibadah') || nodeTitle.includes('sholat') || nodeTitle.includes('wudhu')) {
    return `KONTEKS KATEGORI — FIKIH/IBADAH:
- Format TUTORIAL VISUAL step-by-step.
- Gunakan angle CLOSE-UP pada tangan/kaki (tanpa detail jari) untuk gerakan ibadah.
- Setiap langkah diberi NOMOR URUT visual yang muncul di layar.
- Setting: masjid yang bersih dan indah, dengan cahaya matahari masuk dari jendela.
- Tempo LAMBAT dan jelas pada setiap gerakan — beri jeda untuk pemahaman.`;
  }
  if (nodeTitle.includes('doa') || nodeTitle.includes('dzikir') || nodeTitle.includes('zikir')) {
    return `KONTEKS KATEGORI — DOA/DZIKIR:
- Suasana TENANG dan DAMAI — cahaya lembut, golden hour, bintang-bintang.
- Teks Arab muncul dengan ANIMASI ELEGANT (fade in dari cahaya, efek partikel emas).
- Terjemahan muncul di bawah teks Arab dengan timing yang memberi waktu membaca.
- Background: langit senja, interior masjid dengan lampu hangat, atau taman surgawi.
- Nada naratif: lembut, khusyuk, penuh harap.`;
  }

  // QNA type
  if (contentType === 'QNA') {
    return `KONTEKS KATEGORI — TANYA JAWAB:
- Buka dengan PERTANYAAN BESAR yang muncul di layar dengan animasi dramatis.
- Buat anak PENASARAN — tahan jawaban beberapa detik.
- Gunakan analogi visual yang relatable untuk menjelaskan konsep.
- Akhiri dengan RANGKUMAN singkat + ajakan "sudah tahu jawabannya kan?"`;
  }

  // Default
  return `KONTEKS KATEGORI — EDUKASI ISLAMI:
- Sesuaikan setting visual dengan konteks judul dan isi konten.
- Karakter: siluet 3D berwarna cerah, environment detail.
- Jika menyebut Nabi/Rasul: WAJIB representasi CAHAYA.
- Fokus pada penyampaian ilmu yang jelas dan menarik.`;
}

// ─── Video Script Prompt Builder ─────────────────────────────────────────────

function generateVideoScriptPrompt(content: any, aspectRatio: AspectRatio): string {
  const blocks: string[] = [];

  // QNA detail — unified blocks format
  if (content.qnaDetail) {
    const q = content.qnaDetail;
    if (q.answerQuick) blocks.push(`JAWABAN RINGKAS:\n${q.answerQuick}`);

    if (Array.isArray(q.blocks) && q.blocks.length > 0) {
      for (const b of q.blocks) {
        if (b.type === 'dialog') {
          const lines = b.lines || [{ role: b.role || 'anak', text: b.text || '' }];
          blocks.push(`CONTOH DIALOG:\n${lines.map((l: any) => `${l.role === 'anak' ? '👦 Anak' : l.role === 'ibu' ? '👩 Ibu' : '👨 Ayah'}: ${l.text}`).join('\n')}`);
        }
        if (b.type === 'dalil') {
          const entries = b.entries || [b];
          blocks.push(`DALIL & LANDASAN:\n${entries.map((d: any) => `${d.arabic ? d.arabic + '\n' : ''}${d.translation || ''}\n— ${d.source || ''}`).join('\n\n')}`);
        }
        if (b.type === 'analogy') blocks.push(`ANALOGI:\n${b.title ? b.title + ': ' : ''}${b.text || ''}`);
        if (b.type === 'tip') blocks.push(`TIPS ORANG TUA:\n• ${b.text || ''}`);
        if (b.type === 'hikmah') blocks.push(`HIKMAH:\n${b.text || ''}`);
        if (b.type === 'doa') blocks.push(`DOA:\n${b.translation || ''}\n— ${b.source || ''}`);
        if (b.type === 'paragraph') blocks.push(b.text || '');
      }
    } else {
      // Legacy fields fallback
      if (q.dialogBlocks?.length) {
        blocks.push(`CONTOH DIALOG:\n${q.dialogBlocks.map((d: any) => `${d.role === 'anak' ? '👦 Anak' : '👩 Orang Tua'}: ${d.text}`).join('\n')}`);
      }
      if (q.dalilBlocks?.length) {
        blocks.push(`DALIL & LANDASAN:\n${q.dalilBlocks.map((d: any) => `${d.arabic ? d.arabic + '\n' : ''}${d.translation || d.text}\n— ${d.source}`).join('\n\n')}`);
      }
      if (q.analogyBlocks?.length) {
        blocks.push(`ANALOGI:\n${q.analogyBlocks.map((a: any) => `${a.title ? a.title + ': ' : ''}${a.text}`).join('\n')}`);
      }
      if (q.tipsBlocks?.length) {
        blocks.push(`TIPS ORANG TUA:\n${q.tipsBlocks.map((t: any) => `• ${t.text}`).join('\n')}`);
      }
    }
  }

  // Article / Pembelajaran detail (unified blocks)
  if (content.articleDetail?.blocks?.length) {
    blocks.push(`ISI KONTEN:\n${content.articleDetail.blocks.map((b: any) => {
      if (b.type === 'paragraph' || b.type === 'heading') return b.text;
      if (b.type === 'dalil') {
        const entries = b.entries || [b];
        return entries.map((d: any) => `[DALIL] ${d.arabic || ''}\n${d.translation || ''}\n— ${d.source || ''}`).join('\n\n');
      }
      if (b.type === 'dialog') {
        const lines = b.lines || [{ role: b.role || 'anak', text: b.text || '' }];
        return lines.map((l: any) => `${l.role === 'anak' ? '👦 Anak' : l.role === 'ibu' ? '👩 Ibu' : '👨 Ayah'}: ${l.text}`).join('\n');
      }
      if (b.type === 'analogy') return `[ANALOGI] ${b.title ? b.title + ': ' : ''}${b.text}`;
      if (b.type === 'tip') return `[TIPS] ${b.text}`;
      if (b.type === 'hikmah') return `[HIKMAH] ${b.text}`;
      if (b.type === 'doa') return `[DOA] ${b.translation || ''}\n— ${b.source || ''}`;
      if (b.type === 'quick_answer') return `[JAWABAN INSTAN] ${b.text}`;
      return '';
    }).filter(Boolean).join('\n\n')}`);
  }

  const ageGroup = (content.ageGroups || []).join(', ') || '3-10';
  const typeLabel =
    content.type === 'QNA' ? 'Tanya Jawab' :
    content.type === 'PEMBELAJARAN' ? 'Pembelajaran' :
    content.type === 'KISAH' ? 'Kisah' :
    'Artikel';

  const categoryContext = getCategoryContext(content);

  // Aspect ratio specific instructions
  const isShorts = aspectRatio === '9:16';
  const durationLabel = isShorts ? '60-90 detik' : '90-120 detik';
  const aspectInstructions = isShorts
    ? `FORMAT: YouTube Shorts / Reels (9:16 Portrait)
- Komposisi VERTIKAL — karakter BESAR di tengah frame, environment di atas/bawah.
- HOOK di 3 DETIK PERTAMA — langsung menarik perhatian, tanpa intro panjang.
- Setiap scene MAKSIMAL 3-5 detik — pacing cepat dan padat.
- Teks overlay vertikal, font BESAR dan tebal agar terbaca di mobile.
- Total durasi: ${durationLabel}.
- Transisi CEPAT: cut, whip pan, zoom smash.`
    : `FORMAT: YouTube Standard (16:9 Widescreen)
- Komposisi LANDSCAPE — environment luas, sinematik, bisa gunakan split-screen.
- Boleh ada intro singkat (5-8 detik) sebelum masuk hook.
- Setiap scene 8-15 detik — pacing dinamis, ada ruang untuk breathing room.
- Total durasi: ${durationLabel}.
- Transisi SINEMATIK: fade, dissolve, smooth pan, parallax.`;

  return `=== PROMPT UNTUK AI VIDEO CREATOR ===

Kamu adalah pembuat konten video YouTube Islami untuk anak usia ${ageGroup} tahun.
Buatkan script video narasi berdasarkan konten berikut.

${aspectInstructions}

════════════════════════════════════════
  GAYA VISUAL — 3D PIXAR/DISNEY FACELESS
════════════════════════════════════════

- Animasi 3D bergaya PIXAR/DISNEY — karakter stylized, dunia penuh detail, tekstur kaya.
- TETAP FACELESS — karakter TIDAK boleh menampilkan wajah, mata, hidung, atau mulut.
  Representasi karakter biasa:
  • Siluet 3D berwarna cerah dengan pakaian khas (jubah, baju anak, dll).
  • Figur dengan kepala bulat polos (tanpa fitur wajah) + pakaian berwarna.
  • Lingkaran karakter dengan nama tertulis.
- ⚠️ KHUSUS KARAKTER NABI/RASUL: WAJIB berupa CAHAYA.
  Representasi: sinar keemasan/putih yang bercahaya dengan kehadiran agung.
  JANGAN gunakan siluet, bayangan, atau bentuk tubuh apapun. Cukup cahaya + teks nama.
- Nuansa: warna-warni CERIA, pencahayaan HANGAT (warm lighting), golden hour.
- Environment: DETAIL TINGGI — interior rumah, padang pasir, masjid indah,
  taman bermain, langit berbintang, lautan, dll sesuai konteks.

════════════════════════════════════════
  EKSPRESI EMOSI (TANPA WAJAH)
════════════════════════════════════════

Emosi disampaikan melalui BAHASA TUBUH, WARNA, dan EFEK VISUAL:

- MARAH: tubuh tegang, tangan mengepal, aura merah di sekitar karakter,
  asap/uap keluar dari kepala, environment bergetar.
- SEDIH: postur membungkuk, gerakan sangat lambat, tetesan air (tanpa detail mata),
  warna scene menjadi kelabu/biru pucat, hujan rintik.
- SENANG: lompatan kecil, tangan terangkat, aura kuning cerah,
  confetti/bintang kecil bertebaran, cahaya matahari cerah.
- TAKUT: tubuh mundur/gemetar, bayangan besar membayangi dari belakang,
  warna gelap, cahaya redup berkedip-kedip.
- TAKJUB: tubuh condong ke depan, tangan terbuka lebar,
  cahaya terang menyorot dari atas, partikel emas beterbangan.
- BERPIKIR: kepala (siluet) sedikit miring, awan pikiran/balon tanda tanya
  muncul di atas kepala, background blur.
- MENYESAL: kepala tertunduk, tangan meremas pakaian,
  warna scene gelap → perlahan terang saat bertaubat.
- BERANI: tubuh tegap, dada membusung, langkah mantap ke depan,
  cahaya di belakang karakter (backlight heroik).

════════════════════════════════════════
  TEKNIK NARASI (STORYTELLING MASTERY)
════════════════════════════════════════

- Buka dengan HOOK yang KUAT di awal — pertanyaan mengejutkan, fakta menarik,
  atau situasi yang relatable. Buat anak LANGSUNG penasaran.
- Gunakan PACING DINAMIS — tempo cepat saat aksi/kejutan, lambat saat refleksi/hikmah.
- Bangun KONFLIK atau MISTERI di awal, beri RESOLUSI yang memuaskan di akhir.
- Sisipkan EMOTIONAL BEATS — momen haru, takjub, semangat, atau lucu yang natural.
- Gunakan teknik "SHOW DON'T TELL" — tunjukkan melalui visual, bukan hanya narasi kata.
- Variasi TONE narasi: antusias saat cerita seru, lembut saat hikmah, penuh takjub saat dalil.
- Akhiri dengan RESOLUSI + HIKMAH yang membekas + doa penutup yang menyentuh hati.

════════════════════════════════════════
  ATURAN WAJIB — SYARIAT & DALIL
════════════════════════════════════════

1. Ikuti manhaj Salafus Shalih — HANYA gunakan dalil dari Al-Quran dan Hadits SHAHIH.
2. JANGAN gunakan hadits dha'if, maudhu' (palsu), munkar, atau sumber yang lemah.
3. JANGAN mencampurkan pendapat yang menyelisihi pemahaman salaf.
4. Bahasa sederhana, ceria, dan mudah dipahami anak usia ${ageGroup} tahun.
5. Setiap dalil yang disebutkan HARUS dari sumber di konten — JANGAN tambahkan dalil baru.

════════════════════════════════════════
  ${categoryContext}
════════════════════════════════════════

════════════════════════════════════════
  PEDOMAN MONETISASI KONTEN AI YOUTUBE
════════════════════════════════════════

Konten ini WAJIB memenuhi standar monetisasi YouTube untuk konten AI:

A. NILAI TAMBAH MANUSIA (Human Added Value):
   - Script ini adalah naskah ORISINAL yang ditulis manusia, bukan copy-paste AI.
   - Instruksi visual harus menghasilkan editing DINAMIS: transisi antar scene,
     pergerakan kamera (pan/zoom), penyesuaian tempo, dan efek visual yang
     menunjukkan usaha kreatif (HIGH EFFORT).
   - Setiap video harus memiliki TUJUAN PENYAMPAIAN yang jelas (edukasi Islami).

B. MENGHINDARI "REUSED & REPETITIVE CONTENT":
   - DILARANG format slideshow gambar statis AI yang ditumpuk teks berjalan.
   - Setiap scene harus memiliki VISUAL VARIATIF — angle berbeda, komposisi berbeda,
     warna palette berbeda, layout berbeda.
   - Instruksi narasi harus menghasilkan intonasi EMOSIONAL, bukan monoton/robotik.
     Jika menggunakan AI Voice, pilih model premium yang meniru jeda napas, emosi,
     dan variasi intonasi layaknya manusia.
   - Setiap video harus memiliki DIFERENSIASI — jangan berulang format dan struktur
     yang sama antar video.

C. TRANSPARANSI KONTEN SINTETIS:
   - Konten animasi kartun/ilustrasi TIDAK memerlukan label "Altered Content".
   - DILARANG mengimitasi kreator lain, tokoh publik, atau menggunakan deepfake.

D. ATURAN KHUSUS KONTEN ANAK (Made for Kids):
   - Konten HARUS mendorong pembelajaran, kreativitas, dan interaksi sosial positif.
   - DILARANG konten nonsensical — karakter bergerak tanpa arah atau warna mencolok
     yang mengeksploitasi sensorik tanpa alur cerita.
   - Video harus memiliki ALUR CERITA yang jelas: pembuka, isi, penutup.

E. HAK CIPTA & KEPATUHAN:
   - Pastikan instruksi prompt visual TIDAK menghasilkan karakter yang meniru
     kekayaan intelektual (IP) pihak lain yang sudah ada.
   - Pastikan visual tidak mengandung kekerasan grafis, konten seksual, atau pelanggaran
     pedoman komunitas YouTube.
   - ORISINALITAS DESAIN — setiap karakter harus desain asli.

=== KONTEN SUMBER ===

Judul: ${content.title}
Tipe: ${typeLabel}
Usia Target: ${ageGroup} tahun
Format Video: ${aspectRatio} (${isShorts ? 'YouTube Shorts / Reels' : 'YouTube Standard'})
Durasi: ${durationLabel}
${content.node?.title ? `Kategori: ${content.node.title}` : ''}

${blocks.join('\n\n---\n\n')}

=== INSTRUKSI OUTPUT ===

Berikan output dalam format berikut:

1. JUDUL VIDEO (menarik, SEO-friendly, max 60 karakter)
2. DESKRIPSI YOUTUBE (150-200 kata, include 5 hashtag relevan)

3. KARAKTER (daftar semua karakter yang muncul, untuk konsistensi antar scene):
   Contoh format:
   - [KARAKTER A] "Anak laki-laki, jubah putih pendek, sorban kecil biru, faceless,
     3D Pixar style, warm lighting" — muncul di scene 1, 2, 4, 7
   - [CAHAYA NABI] "Sinar keemasan bercahaya, aura putih keemasan yang agung,
     partikel emas halus" — muncul di scene 3, 5

4. SCRIPT PER SCENE (${isShorts ? '8-12 scene cepat' : '6-10 scene sinematik'}):

   Format SETIAP scene:

   ┌─────────────────────────────────────────────
   │ [SCENE X] — Judul Scene (${isShorts ? '3-5' : '8-15'} detik)
   │
   │ 🖼️ IMAGE PROMPT (tulis dalam BAHASA INGGRIS, siap paste ke AI image generator):
   │ "3D Pixar Disney style, [deskripsi komposisi lengkap], [karakter + pakaian],
   │  [environment detail], [pencahayaan], [warna dominan], [mood],
   │  faceless characters, no face features, warm lighting, 8K quality,
   │  cinematic composition, ${aspectRatio} aspect ratio"
   │
   │ 🎬 GERAKAN & KAMERA (instruksi untuk AI video animator):
   │ - Kamera: [static / slow pan left / zoom in / dolly forward / tilt up / orbit / dll]
   │ - Gerakan karakter: [apa yang dilakukan karakter di scene ini]
   │ - Efek emosi: [aura warna / partikel / perubahan cahaya]
   │ - Durasi: [X detik]
   │ - Transisi ke scene berikutnya: [cut / fade / dissolve / whip pan]
   │
   │ 🎙️ NARASI (teks yang dibacakan, dalam Bahasa Indonesia):
   │ "[Teks narasi yang natural, sesuai tone scene ini]"
   │
   │ 💡 TEKS DI LAYAR (jika ada — kutipan ayat, hadits, atau keyword):
   │ "[Teks Arab + terjemahan]" atau "[Keyword besar]"
   └─────────────────────────────────────────────

   Scene wajib:
   - [SCENE 1] HOOK — langsung menarik perhatian${isShorts ? ' dalam 3 detik pertama' : ''}
   - [SCENE 2-${isShorts ? '11' : '9'}] ISI — alur cerita dengan emotional beats
   - [SCENE TERAKHIR] PENUTUP — hikmah + doa + ajakan subscribe

5. THUMBNAIL:
   - THUMBNAIL TEXT (max 5 kata, provokatif)
   - THUMBNAIL IMAGE PROMPT (bahasa Inggris, siap paste ke AI):
     "3D Pixar style, [komposisi thumbnail], [karakter utama], vibrant colors,
      faceless, dramatic lighting, ${aspectRatio}, 4K, YouTube thumbnail style"

6. TAGS YOUTUBE (10 tags relevan, pisahkan koma)

════════════════════════════════════════
  ATURAN OUTPUT — WAJIB DIIKUTI
════════════════════════════════════════

- Image prompt WAJIB bahasa INGGRIS (agar kompatibel dengan semua AI image/video tool).
- Narasi WAJIB bahasa INDONESIA (untuk voice over).
- Setiap image prompt HARUS menyertakan: "faceless, no face features, no eyes no mouth,
  3D Pixar Disney style, ${aspectRatio}" di akhir.
- Jika ada karakter Nabi/Rasul, image prompt HARUS berisi:
  "glowing golden divine light, radiant white-gold aura, no silhouette no human form,
  sacred presence with floating name text" — JANGAN ada bentuk tubuh.
- Gerakan kamera HARUS bervariasi antar scene — jangan semua static atau semua zoom in.
- Total durasi semua scene = ${durationLabel}.
- Dalil/ayat yang ditampilkan HANYA dari sumber yang tersedia di konten sumber.
- Format ${aspectRatio}. Gaya 3D Pixar/Disney. Faceless. Warm lighting.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateVideoScript(content: any, aspectRatio: AspectRatio = '16:9'): string {
  if (content.type === 'KISAH') return generateKisahScript(content);
  return generateVideoScriptPrompt(content, aspectRatio);
}

export function copyVideoScript(content: any, aspectRatio: AspectRatio = '16:9'): boolean {
  try {
    const script = generateVideoScript(content, aspectRatio);
    navigator.clipboard.writeText(script);
    return true;
  } catch {
    return false;
  }
}
