/**
 * Generate video script prompts from Adably content.
 * 3 modes auto-detected: NARRATIVE | EXPLAINER | AMBIENT
 * All modes share: faceless, nabi=cahaya, dalil shahih, monetisasi YouTube
 */

type AspectRatio = '16:9' | '9:16';
type PromptMode = 'NARRATIVE' | 'EXPLAINER' | 'AMBIENT';

// ─── Auto-detect prompt mode ─────────────────────────────────────────────────

function detectMode(content: any): PromptMode {
  const nodeTitle = (content.node?.title || '').toLowerCase();
  const nodeGroup = (content.node?.group || '').toUpperCase();
  const type = content.type;

  // AMBIENT: doa, dzikir
  if (nodeTitle.includes('doa') || nodeTitle.includes('dzikir') || nodeTitle.includes('zikir')) {
    return 'AMBIENT';
  }
  // NARRATIVE: kisah, cerita
  if (type === 'KISAH' || nodeGroup === 'KISAH' || nodeTitle.includes('kisah') || nodeTitle.includes('cerita')) {
    return 'NARRATIVE';
  }
  // EXPLAINER: everything else (QNA, Pembelajaran, Fikih, Adab, Aqidah, Article)
  return 'EXPLAINER';
}

// ─── Adaptive scene count ────────────────────────────────────────────────────

function getSceneCount(content: any, mode: PromptMode, isShorts: boolean): string {
  const blocks = getBlockCount(content);
  if (mode === 'AMBIENT') return isShorts ? '4-6' : '5-8';
  // NARRATIVE (KISAH) wajib minimum 5 scene untuk memastikan 5 fase arc punya alokasi masing-masing
  if (mode === 'NARRATIVE') {
    if (blocks <= 3) return isShorts ? '5-7'  : '5-7';
    if (blocks <= 6) return isShorts ? '6-9'  : '7-9';
    return isShorts ? '8-12' : '9-12';
  }
  // EXPLAINER
  if (blocks <= 3) return isShorts ? '4-6' : '4-6';
  if (blocks <= 6) return isShorts ? '6-8' : '6-8';
  return isShorts ? '8-12' : '8-10';
}

function getBlockCount(content: any): number {
  let count = 0;
  if (content.qnaDetail) {
    if (content.qnaDetail.answerQuick) count++;
    count += (content.qnaDetail.blocks || content.qnaDetail.dalilBlocks || []).length;
    count += (content.qnaDetail.dialogBlocks || []).length;
    count += (content.qnaDetail.analogyBlocks || []).length;
    count += (content.qnaDetail.tipsBlocks || []).length;
  }
  if (content.articleDetail?.blocks) count += content.articleDetail.blocks.length;
  return Math.max(count, 1);
}

// Fix A1: Deteksi apakah konten sumber memiliki blok analogi nyata
// Jika tidak ada → instruksi analogi harus MELARANG AI membuat analogi baru
function hasAnalogyBlock(content: any): boolean {
  if (content.qnaDetail) {
    // Cek via blocks array (format baru)
    const blocks = content.qnaDetail.blocks || [];
    if (blocks.some((b: any) => b.type === 'analogy')) return true;
    // Cek via legacy analogyBlocks
    if ((content.qnaDetail.analogyBlocks || []).length > 0) return true;
  }
  if (content.articleDetail?.blocks) {
    if (content.articleDetail.blocks.some((b: any) => b.type === 'analogy')) return true;
  }
  return false;
}

// ─── Extract content blocks as text ──────────────────────────────────────────

function extractContentBlocks(content: any): string[] {
  const blocks: string[] = [];

  if (content.qnaDetail) {
    const q = content.qnaDetail;
    if (q.answerQuick) blocks.push(`JAWABAN RINGKAS:\n${q.answerQuick}`);
    if (Array.isArray(q.blocks) && q.blocks.length > 0) {
      for (const b of q.blocks) {
        if (b.type === 'dialog') {
          const lines = b.lines || [{ role: b.role || 'anak', text: b.text || '' }];
          blocks.push(`DIALOG:\n${lines.map((l: any) => `${l.role === 'anak' ? '👦 Anak' : l.role === 'ibu' ? '👩 Ibu' : '👨 Ayah'}: ${l.text}`).join('\n')}`);
        }
        if (b.type === 'dalil') {
          const entries = b.entries || [b];
          blocks.push(`DALIL:\n${entries.map((d: any) => `${d.arabic ? d.arabic + '\n' : ''}${d.translation || ''}\n— ${d.source || ''}`).join('\n\n')}`);
        }
        if (b.type === 'analogy') blocks.push(`ANALOGI:\n${b.title ? b.title + ': ' : ''}${b.text || ''}`);
        if (b.type === 'tip') blocks.push(`TIPS:\n• ${b.text || ''}`);
        if (b.type === 'hikmah') blocks.push(`HIKMAH:\n${b.text || ''}`);
        if (b.type === 'doa') blocks.push(`DOA:\n${b.arabic || ''}\n${b.translation || ''}\n— ${b.source || ''}`);
        if (b.type === 'paragraph') blocks.push(b.text || '');
      }
    } else {
      if (q.dialogBlocks?.length) blocks.push(`DIALOG:\n${q.dialogBlocks.map((d: any) => `${d.role === 'anak' ? '👦 Anak' : '👩 Orang Tua'}: ${d.text}`).join('\n')}`);
      if (q.dalilBlocks?.length) blocks.push(`DALIL:\n${q.dalilBlocks.map((d: any) => `${d.arabic ? d.arabic + '\n' : ''}${d.translation || d.text}\n— ${d.source}`).join('\n\n')}`);
      if (q.analogyBlocks?.length) blocks.push(`ANALOGI:\n${q.analogyBlocks.map((a: any) => `${a.title ? a.title + ': ' : ''}${a.text}`).join('\n')}`);
      if (q.tipsBlocks?.length) blocks.push(`TIPS:\n${q.tipsBlocks.map((t: any) => `• ${t.text}`).join('\n')}`);
    }
  }

  if (content.articleDetail?.blocks?.length) {
    for (const b of content.articleDetail.blocks) {
      if (b.type === 'paragraph' && b.text) blocks.push(b.text);
      if (b.type === 'heading' && b.text) blocks.push(`[HEADING] ${b.text}`);
      if (b.type === 'dalil') {
        const entries = b.entries || [b];
        blocks.push(`DALIL:\n${entries.map((d: any) => `${d.arabic || ''}\n${d.translation || ''}\n— ${d.source || ''}`).join('\n\n')}`);
      }
      if (b.type === 'dialog') {
        const lines = b.lines || [{ role: b.role || 'anak', text: b.text || '' }];
        blocks.push(`DIALOG:\n${lines.map((l: any) => `${l.role === 'anak' ? '👦 Anak' : l.role === 'ibu' ? '👩 Ibu' : '👨 Ayah'}: ${l.text}`).join('\n')}`);
      }
      if (b.type === 'analogy') blocks.push(`ANALOGI: ${b.title ? b.title + ': ' : ''}${b.text}`);
      if (b.type === 'tip') blocks.push(`TIPS: ${b.text}`);
      if (b.type === 'hikmah') blocks.push(`HIKMAH: ${b.text}`);
      if (b.type === 'doa') blocks.push(`DOA:\n${b.arabic || ''}\n${b.translation || ''}\n— ${b.source || ''}`);
    }
  }
  return blocks;
}

// ─── Category context ────────────────────────────────────────────────────────

function getCategoryContext(content: any): string {
  const nodeTitle = (content.node?.title || '').toLowerCase();
  const nodeGroup = (content.node?.group || '').toUpperCase();
  const type = content.type;

  if (nodeGroup === 'KISAH' || type === 'KISAH') {
    if (nodeTitle.includes('nabi') || nodeTitle.includes('rasul')) {
      return `SETTING: Era kenabian. Nabi/Rasul = CAHAYA keemasan. Tokoh lain = siluet 3D berjubah.
Bangun narasi DRAMATIS — tantangan dakwah, ujian, mukjizat. Malaikat = cahaya putih.`;
    }
    if (nodeTitle.includes('sahabat')) {
      return `SETTING: Era sahabat. Suasana perang/dakwah/hijrah. Jika menyebut Nabi = CAHAYA.
Siluet berjubah 3D, warna berbeda per karakter. Fokus pengorbanan dan keteguhan iman.`;
    }
    if (nodeTitle.includes('teladan') || nodeTitle.includes('inspirasi')) {
      return `SETTING: Modern ATAU klasik sesuai cerita. Fokus MORAL LESSON di akhir.
Tunjukkan transformasi karakter. Pakaian sesuai era (modern: kaos/seragam, klasik: jubah).`;
    }
    return `SETTING: Sesuaikan dengan era cerita. Jika ada Nabi/Rasul = CAHAYA.
Karakter: siluet 3D berwarna cerah, pakaian sesuai era.`;
  }
  if (nodeTitle.includes('aqidah') || nodeTitle.includes('tauhid')) {
    return `SETTING: Gunakan METAFORA VISUAL untuk konsep abstrak. Tauhid = cahaya besar.
Representasikan kebesaran Allah melalui alam semesta. Nada: takjub dan kagum.`;
  }
  if (nodeTitle.includes('adab') || nodeTitle.includes('akhlak')) {
    return `SETTING: Sehari-hari anak — rumah, sekolah, masjid, taman.
Tunjukkan BEFORE/AFTER: perilaku buruk (gelap) → belajar → perilaku baik (cerah).`;
  }
  if (nodeTitle.includes('fikih') || nodeTitle.includes('ibadah') || nodeTitle.includes('sholat') || nodeTitle.includes('wudhu')) {
    return `SETTING: Masjid bersih dan indah. Tutorial STEP-BY-STEP.
Close-up tangan/kaki (tanpa detail jari) untuk gerakan ibadah. Nomor urut visual.`;
  }
  if (nodeTitle.includes('doa') || nodeTitle.includes('dzikir') || nodeTitle.includes('zikir')) {
    return `SETTING: Suasana TENANG — golden hour, bintang-bintang, interior masjid hangat.
Teks Arab animasi elegant (fade in + partikel emas). Nada: lembut, khusyuk.`;
  }
  if (type === 'QNA') {
    return `SETTING: Buka dengan PERTANYAAN BESAR dramatis. Buat anak penasaran.
Gunakan analogi visual. Akhiri dengan rangkuman + "sudah tahu jawabannya?"`;
  }
  return `SETTING: Sesuaikan dengan konteks konten. Karakter 3D faceless berwarna cerah.
Jika menyebut Nabi/Rasul: WAJIB representasi CAHAYA.`;
}

// ─── Shared foundation (all modes) ───────────────────────────────────────────

function getSharedFoundation(aspectRatio: AspectRatio): string {
  const isShorts = aspectRatio === '9:16';
  return `
════════════════════════════════════════
  FONDASI WAJIB (BERLAKU UNTUK SEMUA)
════════════════════════════════════════

GAYA VISUAL — 3D PIXAR/DISNEY FACELESS:
- Animasi 3D bergaya PIXAR/DISNEY — stylized, detail tinggi, tekstur kaya.
- FACELESS — karakter TIDAK boleh menampilkan wajah, mata, hidung, atau mulut.
- ⚠️ NABI/RASUL: WAJIB berupa CAHAYA (sinar keemasan/putih bercahaya).
  JANGAN gunakan siluet atau bentuk tubuh apapun. Cukup cahaya + teks nama.
- Nuansa: warna-warni ceria, pencahayaan HANGAT (warm lighting).

SISTEM KARAKTER ADAPTIF:
1. Analisa konten dan identifikasi SEMUA karakter yang muncul.
2. Tentukan ERA/SETTING cerita dari konteks (kuno/modern/fantasi).
3. Setiap KARAKTER UTAMA harus punya IDENTITAS VISUAL UNIK:
   - Warna dominan pakaian (sesuai era: jubah/kaos/seragam/armor/dll)
   - Ukuran/proporsi tubuh (bayi/anak/remaja/dewasa/lansia)
   - 1 aksesoris khas (tongkat/tas/topi/syal/sorban/dll)
   - Jika hewan: jenis + warna bulu yang KONSISTEN antar scene
4. FIGURAN/KERUMUNAN: siluet warna-warni tanpa identitas khusus.
   Kerumunan boleh banyak — tidak ada batasan jumlah.
5. Saat karakter utama PERTAMA KALI muncul: NAME TAG 2-3 detik.
6. Nabi/Rasul: SELALU CAHAYA. Tidak ada pengecualian.

KOMPOSISI MULTI-KARAKTER:
- Karakter UTAMA = lebih besar / depan / lebih terang di frame.
- Figuran/pendukung = lebih kecil / belakang / redup.
- CAHAYA NABI selalu paling DOMINAN dan terang di frame.
- 2 karakter berdialog: shot-reverse-shot atau over-the-shoulder.
- Kerumunan: karakter utama MENONJOL di antara siluet kerumunan.

EKSPRESI EMOSI (TANPA WAJAH):
- Marah: tubuh tegang, tangan mengepal, aura merah, asap dari kepala.
- Sedih: postur bungkuk, lambat, warna kelabu/biru pucat, hujan.
- Senang: lompat kecil, tangan terangkat, aura kuning, confetti.
- Takut: mundur/gemetar, bayangan besar, gelap.
- Takjub: condong ke depan, tangan terbuka, cahaya dari atas.
- Berpikir: kepala miring, awan pikiran muncul.
- Menyesal: tertunduk, meremas pakaian, gelap → terang saat taubat.
- Berani: tegap, langkah mantap, backlight heroik.
- Bicara: gestur tangan aktif, condong ke lawan bicara.
- Mendengar: diam, sedikit miring ke pembicara.

DALIL & KESETIAAN KONTEN SUMBER (⚠️ KRITIS):
- HANYA gunakan dalil dari Al-Quran dan Hadits SHAHIH.
- JANGAN gunakan hadits dha'if, maudhu', atau sumber lemah.
- JANGAN tambahkan dalil, analogi, tips, atau fakta baru yang TIDAK ADA di konten sumber.
- Dalil WAJIB dituliskan LENGKAP dan UTUH:
  • Teks Arab: salin SELURUHNYA tanpa dipotong. JANGAN tulis "..." atau mempersingkat.
  • Terjemahan: salin SELURUHNYA. JANGAN ringkas atau parafrase.
  • Sumber: tulis LENGKAP (contoh: "QS. Al-Baqarah: 183", bukan hanya "Al-Baqarah").
- Jawaban ringkas, analogi, tips, hikmah: gunakan PERSIS dari konten sumber.
  JANGAN ubah makna, JANGAN tambahkan interpretasi sendiri, JANGAN buat versi ringkas.
- Semua informasi dalam narasi video HARUS bisa ditelusuri ke konten sumber di bawah.
  Jika suatu informasi TIDAK ADA di konten sumber, JANGAN masukkan ke narasi.
- Boleh menyusun ulang URUTAN penyampaian untuk alur cerita yang lebih baik,
  tapi ISI dan SUBSTANSI harus 100% dari konten sumber.

PEDOMAN MONETISASI YOUTUBE:
- Editing DINAMIS: transisi, kamera bergerak, efek visual (HIGH EFFORT).
- DILARANG slideshow gambar statis. Setiap scene harus HIDUP.
- Visual VARIATIF antar scene — angle, komposisi, warna berbeda.
- Konten anak: mendorong pembelajaran, ALUR CERITA jelas.
- ORISINALITAS — jangan tiru IP/karakter pihak lain.
- Format: ${aspectRatio}. Aspek rasio: ${isShorts ? 'portrait (9:16)' : 'landscape (16:9)'}.`;
}

// ─── Scene output template ───────────────────────────────────────────────────

function getSceneTemplate(aspectRatio: AspectRatio, isShorts: boolean): string {
  return `
   Format SETIAP scene:

   ┌─────────────────────────────────────────────
   │ [SCENE X] — Judul Scene (durasi detik)
   │
   │ 🖼️ IMAGE PROMPT (BAHASA INGGRIS, siap paste ke AI):
   │ "3D Pixar Disney style, [komposisi], [karakter + pakaian + aksesoris],
   │  [environment], [lighting], [mood], faceless characters,
   │  no face features, no eyes no mouth, warm lighting,
   │  8K, cinematic, ${aspectRatio} aspect ratio"
   │
   │ 🎬 GERAKAN & KAMERA:
   │ - Kamera: [static / pan / zoom / dolly / tilt / orbit]
   │ - Gerakan: [apa yang dilakukan karakter]
   │ - Efek emosi: [aura/partikel/cahaya]
   │ - Durasi: [X detik]
   │ - Transisi: [cut / fade / dissolve / whip pan]
   │
   │ 🎙️ NARASI (Bahasa Indonesia):
   │ "[teks yang dibacakan]"
   │
   │ 💡 TEKS DI LAYAR (opsional):
   │ "[ayat/hadits/keyword]"
   └─────────────────────────────────────────────`;
}

// ─── MODE: NARRATIVE (Kisah) ─────────────────────────────────────────────────

function buildNarrativePrompt(content: any, aspectRatio: AspectRatio): string {
  const isShorts = aspectRatio === '9:16';
  const ageGroup = (content.ageGroups || []).join(', ') || '3-10';
  const durationLabel = isShorts ? '60-90 detik' : '90-120 detik';
  const sceneCount = getSceneCount(content, 'NARRATIVE', isShorts);
  const blocks = extractContentBlocks(content);
  const catCtx = getCategoryContext(content);

  return `=== PROMPT VIDEO — MODE NARASI (KISAH) ===

Kamu adalah pembuat konten video animasi Islami untuk anak usia ${ageGroup} tahun.
Buatkan script video NARATIF berdasarkan kisah berikut.
Durasi: ${durationLabel}. Format: ${aspectRatio}.

${catCtx}
${getSharedFoundation(aspectRatio)}

════════════════════════════════════════
  TEKNIK NARASI — ARC EMOSIONAL 5 FASE
════════════════════════════════════════

Struktur narasi video WAJIB mengikuti 5 fase berikut secara BERURUTAN:

━ FASE 1 — HOOK (scene pertama)
Buka LANGSUNG dengan momen menegangkan, pertanyaan mengejutkan, atau suasana dramatis.
Pembuka wajib membuat penonton TIDAK BISA berhenti menonton.
Contoh: "Langit masih gelap ketika sebuah keputusan mengubah segalanya..."

━ FASE 2 — SETUP (1-2 scene)
Perkenalkan tokoh, tempat, dan suasana secara hangat.
Buat penonton PEDULI pada tokoh sebelum konflik datang.

━ FASE 3 — KONFLIK / UJIAN (2-3 scene)
Ini jantung cerita. Tunjukkan perjuangan, keraguan, dan tekanan.
Akhiri fase ini dengan cliffhanger — penonton harus INGIN tahu kelanjutannya.

━ FASE 4 — KLIMAKS (1-2 scene)
Momen paling intens. Keputusan besar, pertolongan Allah, atau titik balik.
Puncak emosi — visual paling dramatis di seluruh video.

━ FASE 5 — RESOLUSI & KEHANGATAN (scene terakhir)
Tunjukkan buah dari kesabaran/keimanan. Tutup dengan hikmah + doa penutup.
Nada: lembut, hangat, penuh harapan.

ATURAN TRANSISI WAJIB:
- Setiap fase HARUS terhubung ke fase berikutnya via kalimat/visual penghubung.
- Urutan fase TIDAK BOLEH ditukar.
- Contoh kalimat penghubung: "Tapi ujian yang sesungguhnya belum selesai...", "Justru di saat itulah, sesuatu yang tak terduga terjadi..."
- PACING: cepat saat aksi (Fase 3-4), lambat saat refleksi (Fase 5).
- SHOW DON'T TELL — tunjukkan emosi via visual (body language, lighting, efek aura), bukan hanya narasi.

ANALOGI (jika ada dalam konten sumber):
- Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam kisah — bukan analogi generik.
- Test mandiri: jika analogimu bisa dipakai untuk topik LAIN tanpa perubahan → buat ulang.
- Contoh ✅: kisah tentang menunggu pelangi → gunakan pelangi/hujan yang sudah muncul dalam cerita.
- Contoh ❌: kisah tentang menunggu pelangi → "seperti menanam permen di tanah" (tidak ada hubungannya).

=== KONTEN SUMBER ===

Judul: ${content.title}
Usia: ${ageGroup} tahun
Durasi: ${durationLabel}
${content.node?.title ? `Kategori: ${content.node.title}` : ''}

${blocks.join('\n\n---\n\n')}

=== INSTRUKSI OUTPUT ===

1. JUDUL VIDEO (max 60 karakter, SEO-friendly)
2. DESKRIPSI YOUTUBE (150-200 kata + 5 hashtag)
3. KARAKTER — daftar SEMUA karakter + deskripsi visual unik + scene mana muncul
4. SCRIPT PER SCENE (${sceneCount} scene):
${getSceneTemplate(aspectRatio, isShorts)}
5. THUMBNAIL TEXT (max 5 kata) + THUMBNAIL IMAGE PROMPT (English)
6. TAGS YOUTUBE (10 tags)

ATURAN OUTPUT:
- Image prompt BAHASA INGGRIS. Narasi BAHASA INDONESIA.
- Setiap image prompt akhiri: "faceless, no face features, no eyes no mouth, 3D Pixar Disney style, ${aspectRatio}"
- Nabi/Rasul di image prompt: "glowing golden divine light, radiant aura, no human form, sacred presence with name text"
- Kamera BERVARIASI antar scene. Total durasi = ${durationLabel}.

⚠️ KESETIAAN KONTEN (WAJIB):
- Dalil (ayat/hadits) WAJIB ditulis LENGKAP — teks Arab UTUH + terjemahan UTUH + sumber LENGKAP.
  DILARANG memotong ayat, menulis "...", atau meringkas terjemahan.
- Jawaban, analogi, tips, hikmah: gunakan PERSIS seperti di konten sumber di atas.
  DILARANG mengarang, memparafrase, atau menambah informasi yang tidak ada di konten sumber.
- Jika konten sumber TIDAK menyebutkan suatu fakta/dalil, JANGAN masukkan ke narasi video.
- Narasi boleh menyusun ulang URUTAN, tapi ISI harus 100% dari konten sumber.`;
}

// ─── MODE: EXPLAINER (QNA, Pembelajaran, Fikih) ──────────────────────────────

function buildExplainerPrompt(content: any, aspectRatio: AspectRatio): string {
  const isShorts = aspectRatio === '9:16';
  const ageGroup = (content.ageGroups || []).join(', ') || '3-10';
  const durationLabel = isShorts ? '60-90 detik' : '90-120 detik';
  const sceneCount = getSceneCount(content, 'EXPLAINER', isShorts);
  const blocks = extractContentBlocks(content);
  const catCtx = getCategoryContext(content);
  const typeLabel = content.type === 'QNA' ? 'Tanya Jawab' : content.type === 'PEMBELAJARAN' ? 'Pembelajaran' : 'Artikel';
  const isQna = content.type === 'QNA';
  const isPembelajaran = content.type === 'PEMBELAJARAN';
  const isArtikel = content.type === 'ARTIKEL' || content.type === 'ARTICLE';
  const pov = content.pov || '';

  // POV label untuk artikel
  let povSection = '';
  if (isArtikel && pov === 'ORTU') {
    povSection = `\nSudut Pandang: ORANG TUA — Tulis untuk orang tua yang ingin mendidik anak.\nGunakan bahasa orang dewasa yang reflektif, empatis, dan actionable.\nFokus: tips parenting, panduan mendidik, insight praktis.\n`;
  } else if (isArtikel && pov === 'ANAK') {
    povSection = `\nSudut Pandang: ANAK — Tulis dari perspektif anak atau untuk anak lebih dewasa (10-13 tahun).\nGunakan bahasa yang relatable, segar, dan memotivasi.\nFokus: pengalaman, rasa ingin tahu, pembentukan karakter.\n`;
  }

  // Teknik section berbeda per tipe
  const hasAnalogy = hasAnalogyBlock(content);
  let teknikSection = '';
  if (isQna) {
    teknikSection = `
════════════════════════════════════════
  TEKNIK EXPLAINER — TANYA JAWAB (QNA)
════════════════════════════════════════

URUTAN ALUR WAJIB (ikuti urutan ini):
1. 💡 HOOK — Buka dengan PERTANYAAN BESAR dramatis. Buat anak penasaran langsung dari scene 1.
2. 💬 DIALOG — Tampilkan percakapan NYATA antara Anak dengan Ibu ATAU Anak dengan Ayah.
3. 📖 DALIL — Visual landasan Al-Quran/Hadits yang memperkuat dialog.
4. 🧩 ANALOGI — Perumpamaan visual yang menyederhanakan dalil.
5. ℹ️ TIPS — Highlight poin praktis untuk keluarga.
6. ✨ HIKMAH + DOA — Penutup hangat.

KUNCI ALUR: Setiap scene harus TERASA SAMBUNGAN dari scene sebelumnya.
Dialog menjelaskan jawaban. Dalil memperkuat dialog. Analogi menyederhanakan dalil. Tips mengaplikasikan semuanya.

PANDUAN DIALOG (WAJIB):
- Dialog harus seperti percakapan NYATA di rumah — BUKAN tanya-jawab formal atau ceramah.
- Anak BOLEH menyela, menyanggah, atau bertanya lagi.
- Orang tua BOLEH berpikir sebentar, menggunakan cerita pendek, atau bertanya balik.
- Gunakan BAHASA SEHARI-HARI keluarga muslim.

  ❌ KAKU (HINDARI): "Nak, tahukah kamu bahwa shalat itu wajib?"
  ✅ NATURAL (TIRU): "Hmm, kamu pernah nggak merasa lemas kalau belum makan seharian?
     Nah, sholat itu makanan untuk hati kita..."

- Gunakan INFOGRAFIS ANIMASI untuk poin penting: teks keyword besar, diagram sederhana, ikon.
- Jika ada LANGKAH-LANGKAH: tampilkan STEP-BY-STEP dengan nomor urut visual.
- JANGAN buat narasi dramatik berlebihan — tone INFORMATIF dan CERIA.

ANALOGI${hasAnalogy ? ' (dari konten sumber)' : ''}:
${hasAnalogy
  ? `- Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam konten sumber — bukan analogi generik.
- Test mandiri: jika analogimu bisa dipakai untuk topik LAIN tanpa perubahan → buat ulang.
- Contoh ✅: QNA tentang wudhu → analogi menggunakan air/bersih yang sudah ada dalam konten.
- Contoh ❌: QNA tentang wudhu → "seperti mengisi bensin di SPBU" (tidak muncul dalam konten).`
  : `- Konten sumber TIDAK memiliki blok analogi.
- JANGAN buat analogi baru. Gunakan langsung jawaban/dalil yang ada.
- Lewati urutan langkah ANALOGI di atas.`
}`;
  } else if (isPembelajaran) {
    teknikSection = `
════════════════════════════════════════
  TEKNIK EXPLAINER — PEMBELAJARAN
════════════════════════════════════════

URUTAN BLOK PEDAGOGIS WAJIB (ikuti urutan ini untuk pembelajaran efektif):
1. 📝 HOOK — Buka dengan pertanyaan/fakta/cerita pendek yang buat anak PENASARAN (scene 1).
2. 📝 PENJELASAN INTI — Jelaskan konsep utama dengan bahasa sederhana.
3. 📖 DALIL — Tunjukkan landasan dari Al-Quran/Hadits (visual yang memperkuat).
4. 🧩 ANALOGI — Buat konsep lebih mudah dimengerti via perumpamaan visual.
5. 📝 PRAKTIK — Langkah konkret yang bisa dilakukan anak (step-by-step jika ada).
6. ℹ️ TIPS — Panduan untuk orang tua (infografis pendek).
7. ✨ HIKMAH — Refleksi mengapa ini penting.
8. 🤲 DOA — Doa yang relevan.

KUNCI: Setiap scene harus menjawab "lalu apa?" dari scene sebelumnya — satu alur mengalir.

- Buka dengan PERTANYAAN BESAR atau FAKTA MENARIK — buat anak penasaran.
- Jika ada LANGKAH-LANGKAH: tampilkan STEP-BY-STEP dengan nomor urut visual.
- Gunakan INFOGRAFIS ANIMASI: teks keyword besar, diagram sederhana, ikon.
- Setiap poin penting: HIGHLIGHT dengan efek visual (zoom, glow, underline).
- JANGAN buat narasi dramatik berlebihan — tone INFORMATIF dan CERIA.

ANALOGI${hasAnalogy ? ' (dari konten sumber)' : ''}:
${hasAnalogy
  ? `- Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam konten sumber — bukan analogi generik.
- Test mandiri: jika analogimu bisa dipakai untuk topik LAIN tanpa perubahan → buat ulang.
- Contoh ✅: materi tentang sholat → analogi menggunakan ritual/waktu yang sudah disebutkan dalam konten.
- Contoh ❌: materi tentang sholat → analogi yang tidak ada hubungannya dengan isi konten.`
  : `- Konten sumber TIDAK memiliki blok analogi.
- JANGAN buat analogi baru. Lewati blok ANALOGI dalam urutan pedagogis.
- Langsung lanjut ke PRAKTIK setelah DALIL.`
}`;
  } else {
    // ARTIKEL
    teknikSection = `
════════════════════════════════════════
  TEKNIK EXPLAINER — ARTIKEL${pov ? ` (POV: ${pov})` : ''}
════════════════════════════════════════
${povSection}
- Buka dengan HOOK — jangan langsung masuk materi. Mulai dengan anekdot nyata, pertanyaan, atau fakta mengejutkan.
- Gunakan contoh nyata dari kehidupan anak/keluarga.
- Setiap heading harus membuat penonton ingin lanjut menonton.
- Tutup setiap section dengan kalimat yang menghubungkan ke section berikutnya.
- Akhiri dengan CALL TO ACTION yang hangat dan mendorong tindakan.
- Gunakan INFOGRAFIS ANIMASI untuk poin-poin penting.
- JANGAN buat narasi dramatik berlebihan — tone sesuai POV (reflektif untuk ORTU, segar untuk ANAK).

ANALOGI${hasAnalogy ? ' (dari konten sumber)' : ''}:
${hasAnalogy
  ? `- Analogi WAJIB lahir dari elemen yang SUDAH ADA dalam konten sumber.
- Test mandiri: jika analogimu bisa dipakai untuk topik LAIN tanpa perubahan → buat ulang.`
  : `- Konten sumber TIDAK memiliki blok analogi. JANGAN buat analogi baru.`
}`;
  }

  return `=== PROMPT VIDEO — MODE EXPLAINER (EDUKASI) ===

Kamu adalah pembuat konten video EDUKASI Islami untuk anak usia ${ageGroup} tahun.
Buatkan script video EXPLAINER (penjelasan visual) berdasarkan konten berikut.
Durasi: ${durationLabel}. Format: ${aspectRatio}.

${catCtx}
${getSharedFoundation(aspectRatio)}
${teknikSection}

=== KONTEN SUMBER ===

Judul: ${content.title}
Tipe: ${typeLabel}${pov ? `\nSudut Pandang: ${pov}` : ''}
Usia: ${ageGroup} tahun
Durasi: ${durationLabel}
${content.node?.title ? `Kategori: ${content.node.title}` : ''}

${blocks.join('\n\n---\n\n')}

=== INSTRUKSI OUTPUT ===

1. JUDUL VIDEO (max 60 karakter, SEO-friendly)
2. DESKRIPSI YOUTUBE (150-200 kata + 5 hashtag)
3. KARAKTER — daftar karakter + deskripsi visual unik + scene mana muncul
4. SCRIPT PER SCENE (${sceneCount} scene, ikuti urutan alur yang tertera di atas):
${getSceneTemplate(aspectRatio, isShorts)}
5. THUMBNAIL TEXT (max 5 kata) + THUMBNAIL IMAGE PROMPT (English)
6. TAGS YOUTUBE (10 tags)

ATURAN OUTPUT:
- Image prompt BAHASA INGGRIS. Narasi BAHASA INDONESIA.
- Setiap image prompt akhiri: "faceless, no face features, no eyes no mouth, 3D Pixar Disney style, ${aspectRatio}"
- Jika ada Nabi/Rasul: "glowing golden divine light, no human form, sacred presence with name text"
- Kamera BERVARIASI. Total durasi = ${durationLabel}.
- Sesuaikan jumlah scene dengan KEPADATAN konten — jangan paksakan banyak scene jika konten pendek.

(Lihat FONDASI WAJIB di atas untuk aturan kesetiaan konten, dalil, dan karakter visual.)`;
}


// ─── MODE: AMBIENT (Doa, Dzikir) ────────────────────────────────────────────

function buildAmbientPrompt(content: any, aspectRatio: AspectRatio): string {
  const isShorts = aspectRatio === '9:16';
  const ageGroup = (content.ageGroups || []).join(', ') || '3-10';
  const durationLabel = isShorts ? '60-90 detik' : '90-120 detik';
  const sceneCount = getSceneCount(content, 'AMBIENT', isShorts);
  const blocks = extractContentBlocks(content);

  return `=== PROMPT VIDEO — MODE AMBIENT (DOA/DZIKIR) ===

Kamu adalah pembuat konten video Islami untuk anak usia ${ageGroup} tahun.
Buatkan script video AMBIENT (visual tenang + teks animasi) untuk doa/dzikir berikut.
Durasi: ${durationLabel}. Format: ${aspectRatio}.
${getSharedFoundation(aspectRatio)}

════════════════════════════════════════
  TEKNIK AMBIENT
════════════════════════════════════════

- Suasana TENANG dan DAMAI — golden hour, langit senja, bintang, interior masjid hangat.
- TEKS ARAB muncul dengan animasi ELEGANT: fade in dari cahaya, partikel emas halus.
- TERJEMAHAN muncul di bawah teks Arab, timing memberi waktu baca.
- Narasi LEMBUT, KHUSYUK, penuh harap — seperti berbisik kepada anak.
- MINIMAL karakter — fokus pada keindahan visual dan ketenangan.
- Jika ada karakter (anak berdoa): siluet kecil, posisi berdoa, cahaya dari atas.
- Kamera: SANGAT LAMBAT — slow dolly, gentle pan, static contemplative shots.
- Warna: hangat, lembut, emas/biru tua/ungu gelap.

=== KONTEN SUMBER ===

Judul: ${content.title}
Usia: ${ageGroup} tahun
Durasi: ${durationLabel}
${content.node?.title ? `Kategori: ${content.node.title}` : ''}

${blocks.join('\n\n---\n\n')}

=== INSTRUKSI OUTPUT ===

1. JUDUL VIDEO (max 60 karakter)
2. DESKRIPSI YOUTUBE (150-200 kata + 5 hashtag)
3. SCRIPT PER SCENE (${sceneCount} scene):
${getSceneTemplate(aspectRatio, isShorts)}
   Fokus: teks Arab animasi + visual tenang. Minimal gerakan karakter.
4. THUMBNAIL TEXT (max 5 kata) + THUMBNAIL IMAGE PROMPT (English)
5. TAGS YOUTUBE (10 tags)

ATURAN OUTPUT:
- Image prompt BAHASA INGGRIS. Narasi BAHASA INDONESIA.
- Setiap image prompt akhiri: "faceless, no face features, 3D Pixar Disney style, ${aspectRatio}, serene, warm"
- Kamera SANGAT LAMBAT. Total durasi = ${durationLabel}.
- Setiap scene bertransisi dengan DISSOLVE atau FADE — tidak ada cut keras.

⚠️ KESETIAAN KONTEN (WAJIB):
- Teks doa/dzikir WAJIB ditulis LENGKAP — teks Arab UTUH + terjemahan UTUH + sumber LENGKAP.
  DILARANG memotong, menulis "...", atau meringkas.
- JANGAN menambahkan doa/dzikir yang tidak ada di konten sumber.
- Narasi boleh menyusun ulang URUTAN, tapi ISI harus 100% dari konten sumber.`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateVideoScript(content: any, aspectRatio: AspectRatio = '16:9'): string {
  const mode = detectMode(content);
  switch (mode) {
    case 'NARRATIVE': return buildNarrativePrompt(content, aspectRatio);
    case 'AMBIENT':   return buildAmbientPrompt(content, aspectRatio);
    case 'EXPLAINER':
    default:          return buildExplainerPrompt(content, aspectRatio);
  }
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
