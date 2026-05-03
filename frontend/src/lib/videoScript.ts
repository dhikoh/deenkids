/**
 * Generate a video script prompt or story script from Adably content.
 * KISAH type → clean narration script (Naskah Kisah)
 * Other types → YouTube video script prompt
 * Follows manhaj salaf guidelines and avoids tashwir of living creatures.
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

  // QNA detail
  if (content.qnaDetail) {
    const q = content.qnaDetail;
    if (q.answerQuick) blocks.push(`JAWABAN RINGKAS:\n${q.answerQuick}`);
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

  // Article / Pembelajaran detail (unified blocks)
  if (content.articleDetail?.blocks?.length) {
    blocks.push(`ISI KONTEN:\n${content.articleDetail.blocks.map((b: any) => {
      if (b.type === 'paragraph' || b.type === 'heading') return b.text;
      if (b.type === 'dalil') return `[DALIL] ${b.arabic || ''}\n${b.translation || b.text}\n— ${b.source || ''}`;
      if (b.type === 'dialog') return `${b.role === 'anak' ? '👦 Anak' : '👩 Orang Tua'}: ${b.text}`;
      if (b.type === 'analogy') return `[ANALOGI] ${b.title ? b.title + ': ' : ''}${b.text}`;
      if (b.type === 'tip') return `[TIPS] ${b.text}`;
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

ATURAN WAJIB:
1. Ikuti manhaj Salafus Shalih — HANYA gunakan dalil dari Al-Quran dan Hadits Shahih.
2. JANGAN gunakan hadits dha'if atau maudhu'.
3. JANGAN mencampurkan pendapat yang menyelisihi pemahaman salaf.
4. Bahasa sederhana, ceria, dan mudah dipahami anak usia ${ageGroup} tahun.
5. PENTING — Untuk deskripsi visual / instruksi animasi:
   - JANGAN gambarkan wajah atau detail tubuh makhluk hidup (manusia/hewan).
   - Gunakan HANYA: siluet, bayangan, objek alam (bunga, bintang, awan, gunung),
     tipografi animasi, ikon tangan/kaki tanpa detail, bentuk geometris berwarna,
     atau balon chat dialog.
   - Representasi karakter: gunakan lingkaran warna-warni dengan nama,
     atau siluet tanpa detail wajah.
6. Setiap dalil yang disebutkan HARUS dari sumber di konten — JANGAN tambahkan dalil baru.

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
5. TAGS YOUTUBE (10 tags relevan, pisahkan koma)`;
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
