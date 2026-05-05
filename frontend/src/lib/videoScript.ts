/**
 * Generate a video script prompt or story script from Adably content.
 * KISAH type → clean narration script (Naskah Kisah)
 * Other types → YouTube video script prompt
 * Follows manhaj salaf guidelines, avoids tashwir of living creatures,
 * and complies with YouTube AI content monetization guidelines.
 */

// ─── KISAH: Clean Narration Script ───────────────────────────────────────────

function generateKisahScript(content: any): string {
  const ageLabel = (content.ageGroups || []).join(', ') || 'semua usia';
  const nodeTitle = content.node?.title || 'Kisah Islami';

  // Build ordered paragraphs from articleDetail blocks
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

// ─── OTHER TYPES: YouTube Video Script Prompt ────────────────────────────────

function generateVideoScriptPrompt(content: any): string {
  const blocks: string[] = [];

  // QNA detail — unified blocks format
  if (content.qnaDetail) {
    const q = content.qnaDetail;
    if (q.answerQuick) blocks.push(`JAWABAN RINGKAS:\n${q.answerQuick}`);

    // Unified blocks (new format)
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
        if (b.type === 'analogy') {
          blocks.push(`ANALOGI:\n${b.title ? b.title + ': ' : ''}${b.text || ''}`);
        }
        if (b.type === 'tip') {
          blocks.push(`TIPS ORANG TUA:\n• ${b.text || ''}`);
        }
        if (b.type === 'hikmah') {
          blocks.push(`HIKMAH:\n${b.text || ''}`);
        }
        if (b.type === 'doa') {
          blocks.push(`DOA:\n${b.translation || ''}\n— ${b.source || ''}`);
        }
        if (b.type === 'paragraph') {
          blocks.push(b.text || '');
        }
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
    'Artikel';

  return `=== PROMPT UNTUK AI VIDEO CREATOR ===

Kamu adalah pembuat konten video YouTube Islami untuk anak usia ${ageGroup} tahun.
Buatkan script video narasi berdurasi 3-5 menit berdasarkan konten berikut.

════════════════════════════════════════
  ATURAN WAJIB — VISUAL & SYARIAT
════════════════════════════════════════

1. Ikuti manhaj Salafus Shalih — HANYA gunakan dalil dari Al-Quran dan Hadits Shahih.
2. JANGAN gunakan hadits dha'if atau maudhu'.
3. JANGAN mencampurkan pendapat yang menyelisihi pemahaman salaf.
4. Bahasa sederhana, ceria, dan mudah dipahami anak usia ${ageGroup} tahun.
5. PENTING — Untuk deskripsi visual / instruksi animasi:
   - JANGAN gambarkan wajah atau detail tubuh makhluk hidup (manusia/hewan).
   - Gunakan HANYA: siluet, bayangan, objek alam (bunga, bintang, awan, gunung),
     tipografi animasi, ikon tangan/kaki tanpa detail, bentuk geometris berwarna,
     atau balon chat dialog.
   - Representasi karakter biasa: gunakan lingkaran warna-warni dengan nama,
     atau siluet tanpa detail wajah.
   - ⚠️ KHUSUS KARAKTER NABI/RASUL: WAJIB direpresentasikan sebagai CAHAYA
     (sinar terang, aura bercahaya, berkas cahaya keemasan/putih). JANGAN gunakan
     siluet, bayangan, atau bentuk tubuh apapun untuk Nabi/Rasul. Cukup cahaya
     yang bersinar dengan kehadiran yang agung, disertai teks nama beliau.
6. Setiap dalil yang disebutkan HARUS dari sumber di konten — JANGAN tambahkan dalil baru.

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
   - DILARANG mencampurkan karakter berhak cipta ke dalam satu cerita hanya demi
     memancing klik.
   - Video harus memiliki ALUR CERITA yang jelas: pembuka, isi, penutup.

E. HAK CIPTA & KEPATUHAN:
   - Pastikan instruksi prompt visual TIDAK menghasilkan karakter yang meniru
     kekayaan intelektual (IP) pihak lain yang sudah ada.
   - Pastikan visual tidak mengandung elemen kekerasan grafis, konten seksual,
     atau atribut yang melanggar pedoman komunitas YouTube.
   - ORISINALITAS DESAIN — setiap karakter harus desain asli, bukan tiruan.

=== KONTEN SUMBER ===

Judul: ${content.title}
Tipe: ${typeLabel}
Usia Target: ${ageGroup} tahun
${content.node?.title ? `Kategori: ${content.node.title}` : ''}

${blocks.join('\n\n---\n\n')}

=== INSTRUKSI OUTPUT ===

Berikan output dalam format berikut:

1. JUDUL VIDEO (menarik, SEO-friendly, max 60 karakter)
2. DESKRIPSI YOUTUBE (150-200 kata, include 5 hashtag relevan)
3. SCRIPT NARASI (per scene):
   - [SCENE 1] Pembuka — deskripsi visual + narasi
   - [SCENE 2] dst...
   - [SCENE PENUTUP] Ajakan + doa
4. THUMBNAIL TEXT (teks pendek untuk thumbnail, max 5 kata)
5. TAGS YOUTUBE (10 tags relevan, pisahkan koma)

CATATAN PENTING:
- Setiap scene HARUS memiliki instruksi visual yang BERBEDA dan VARIATIF.
- Deskripsi visual harus detail: komposisi, warna, pergerakan, transisi.
- Karakter Nabi/Rasul = CAHAYA (sinar keemasan/putih bercahaya). BUKAN siluet.
- Jangan gunakan format slideshow statis. Setiap frame harus hidup dan dinamis.`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateVideoScript(content: any): string {
  if (content.type === 'KISAH') return generateKisahScript(content);
  return generateVideoScriptPrompt(content);
}

export function copyVideoScript(content: any): boolean {
  try {
    const script = generateVideoScript(content);
    navigator.clipboard.writeText(script);
    return true;
  } catch {
    return false;
  }
}
