/**
 * Generate a video script prompt from Adably content — ready to paste into AI tools.
 * Follows manhaj salaf guidelines and avoids tashwir of living creatures.
 */
export function generateVideoScript(content: any): string {
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

  // Article detail
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

  const ageGroup = content.ageGroup || '3-10';

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
Tipe: ${content.type === 'QNA' ? 'Tanya Jawab' : 'Artikel/Pembelajaran'}
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

export function copyVideoScript(content: any): boolean {
  try {
    const script = generateVideoScript(content);
    navigator.clipboard.writeText(script);
    return true;
  } catch {
    return false;
  }
}
