"use client";

import { useState, useEffect } from "react";
import { Wand2, Copy, Check, PenLine, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";

type ContentType = "QNA" | "PEMBELAJARAN" | "ARTIKEL" | "IMAGE_PROMPT";

const HISTORY_KEY = "adably_prompt_history";
const MAX_HISTORY = 5;

function generatePrompt(type: ContentType, title: string, ages: string[], options: Record<string, boolean>): string {
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
═══════════════════════════════════════

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

  return prompt;
}

function generateImagePrompt(
  title: string,
  style: string,
  options: Record<string, boolean>,
  extras: { expression: string; activity: string; setting: string; colorPalette: string }
): string {
  let prompt = `Tolong buatkan gambar (image generation) untuk thumbnail artikel edukasi anak Islami.

Konteks Judul: "${title}"

Spesifikasi Wajib:
- Gaya Visual: ${style}
- Nuansa: Ramah anak, warna-warni ceria, pencahayaan hangat (warm lighting)
- Aspek Rasio: Widescreen 16:9 (Sangat Penting!)`;

  if (extras.setting.trim()) {
    prompt += `\n- Latar/Setting: ${extras.setting.trim()}`;
  }

  if (extras.colorPalette.trim()) {
    prompt += `\n- Palet Warna Dominan: ${extras.colorPalette.trim()}`;
  }

  if (options.noLivingBeings) {
    prompt += `\n- Karakter: TANPA makhluk bernyawa (manusia/hewan utuh). Gunakan siluet, objek benda mati, pemandangan, atau simbol islami (masjid, Al-Quran, dll).`;
  } else {
    prompt += `\n- Karakter Manusia (WAJIB FACELESS): Jika menampilkan orang, WAJIB tanpa fitur wajah (TIDAK ADA mata, hidung, atau mulut — wajah harus rata/kosong/blank face).
  * Ayah: Berjenggot, mengenakan pakaian muslim/koko.
  * Ibu: Mengenakan hijab syar'i yang menjulur panjang.
  * Anak Laki-laki: Mengenakan peci/kopiah.
  * Anak Perempuan: Mengenakan hijab.`;

    if (extras.expression.trim()) {
      prompt += `\n- Ekspresi/Suasana Hati: ${extras.expression.trim()} (gambarkan melalui bahasa tubuh, postur, dan gesture — bukan wajah).`;
    }

    if (extras.activity.trim()) {
      prompt += `\n- Aktivitas/Tindakan yang Digambarkan: ${extras.activity.trim()}.`;
    }
  }

  if (options.includeText) {
    prompt += `\n- Tipografi/Teks: Tambahkan teks judul "${title}" di dalam gambar dengan tipografi tebal (bold), mudah dibaca, dan letakkan di tengah atau area yang kosong. PASTIKAN EJAAN BENAR 100%.`;
  } else {
    prompt += `\n- Aturan Ketat: TIDAK BOLEH ADA TEKS, HURUF, ATAU TULISAN APAPUN di dalam gambar (kami akan menambahkan teks secara manual). Berikan "Negative Space" (ruang kosong) agar kami bisa menaruh teks nanti.`;
  }

  const engActivity = extras.activity.trim() ? `, performing: ${extras.activity.trim()}` : "";
  const engExpression = extras.expression.trim() && !options.noLivingBeings ? `, mood/expression shown through body language: ${extras.expression.trim()}` : "";
  const engSetting = extras.setting.trim() ? `, set in: ${extras.setting.trim()}` : "";
  const engColors = extras.colorPalette.trim() ? `, dominant color palette: ${extras.colorPalette.trim()}` : "";

  prompt += `

(Prompt for Engine / English Translation reference):
"A high quality illustration for Islamic kids education titled ${title}. Style: ${style}. ${options.noLivingBeings ? "No living beings, no humans, no animals, focus on objects/environment." : `FACELESS characters (strictly NO eyes, NO nose, NO mouth, completely blank faces). Muslim father with beard, muslim mother with long hijab, muslim boy with kufi, muslim girl with hijab${engActivity}${engExpression}`}${engSetting}${engColors}. Warm lighting, vibrant colors. ${options.includeText ? `Include text "${title}"` : "NO TEXT, NO LETTERS, clean composition with negative space."} --ar 16:9"`;

  return prompt;
}

export default function PromptGeneratorPage() {
  const [mode, setMode] = useState<"CONTENT" | "IMAGE">("CONTENT");
  const [type, setType] = useState<ContentType>("QNA");
  const [title, setTitle] = useState("");
  const [ages, setAges] = useState<string[]>(["5-7"]);
  const [options, setOptions] = useState({
    dalil: true,
    analogi: true,
    dialog: true,
    tips: true,
    perbedaanPendapat: false,
  });

  const [imageStyle, setImageStyle] = useState<string>("Animasi 3D (Pixar/Disney)");
  const [imageOptions, setImageOptions] = useState({
    noLivingBeings: false,
    includeText: false,
  });
  const [imageExtras, setImageExtras] = useState({
    expression: "",
    activity: "",
    setting: "",
    colorPalette: "",
  });

  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<{ title: string; type: ContentType; prompt: string; date: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {}
  }, []);

  const handleGenerate = () => {
    if (!title.trim()) return toast.error("Judul/topik wajib diisi");
    
    let prompt = "";
    let historyType: ContentType = type;
    
    if (mode === "CONTENT") {
      prompt = generatePrompt(type, title.trim(), ages, options);
    } else {
      prompt = generateImagePrompt(title.trim(), imageStyle, imageOptions, imageExtras);
      historyType = "IMAGE_PROMPT";
    }
    
    setGeneratedPrompt(prompt);

    // Save to history
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
            <div className="grid grid-cols-3 gap-3">
              {typeConfigs.map(t => (
                <button key={t.value} onClick={() => setType(t.value)} className={`p-4 rounded-xl text-left border-2 transition-all ${type === t.value ? "border-purple-500 bg-purple-50 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}>
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-bold text-sm text-slate-800 mt-1">{t.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
              </div>

              {/* Judul */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Judul / Topik Konten</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Mengapa Kita Harus Sholat 5 Waktu?" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-purple-500" />
              </div>

              {/* Usia */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-2">3. Target Usia</label>
            <div className="flex flex-wrap gap-2">
              {["3-5", "5-7", "7-10", "10-13", "Semua Usia"].map(age => (
                <label key={age} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer text-sm font-bold transition-all ${ages.includes(age) ? "border-purple-500 bg-purple-50 text-purple-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                  <input type="checkbox" checked={ages.includes(age)} onChange={() => toggleAge(age)} className="w-4 h-4 text-purple-600 rounded" />
                  {age === "Semua Usia" ? age : `${age} Tahun`}
                </label>
              ))}
            </div>
              </div>

              {/* Opsi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-sm font-bold text-slate-700 mb-3">4. Opsi Tambahan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>
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

              {/* Judul */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-2">2. Konteks Judul Artikel</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Contoh: Mengapa Kita Harus Sholat 5 Waktu?" className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:border-purple-500 focus:ring-purple-500" />
                <p className="text-xs text-slate-400 mt-2">AI akan menggambar elemen yang relevan dengan topik ini.</p>
              </div>

              {/* Opsi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-3">3. Aturan Pembuatan</label>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${imageOptions.includeText ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={imageOptions.includeText} onChange={e => setImageOptions({ ...imageOptions, includeText: e.target.checked })} className="w-4 h-4 mt-0.5 text-amber-600 rounded" />
                    <div>
                      <p className="font-bold">Sertakan Teks Judul di Gambar</p>
                      <p className="text-xs mt-0.5 opacity-80">Catatan: AI sering *typo*. Direkomendasikan dimatikan jika Anda ingin menambahkan teks secara manual via Canva.</p>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-all ${imageOptions.noLivingBeings ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={imageOptions.noLivingBeings} onChange={e => setImageOptions({ ...imageOptions, noLivingBeings: e.target.checked })} className="w-4 h-4 mt-0.5 text-emerald-600 rounded" />
                    <div>
                      <p className="font-bold">Tanpa Makhluk Bernyawa (Hanya Objek)</p>
                      <p className="text-xs mt-0.5 opacity-80">Gambar hanya akan menampilkan siluet, objek benda mati, atau pemandangan untuk mematuhi syariat.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Konteks Tambahan */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-bold text-slate-700 mb-1">4. Konteks Tambahan <span className="text-xs font-normal text-slate-400">(opsional — semakin detail semakin baik)</span></label>
                <p className="text-xs text-slate-400 mb-4">Isi salah satu atau semua field di bawah untuk menghasilkan prompt yang lebih kaya dan spesifik.</p>
                <div className="space-y-3">
                  {/* Aktivitas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">⚡ Aktivitas / Tindakan</label>
                    <input
                      type="text"
                      value={imageExtras.activity}
                      onChange={e => setImageExtras({ ...imageExtras, activity: e.target.value })}
                      placeholder="misal: Sholat berjamaah, Memasukkan koin sedekah, Membaca Al-Quran bersama"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>

                  {/* Ekspresi — disembunyikan jika noLivingBeings aktif */}
                  {!imageOptions.noLivingBeings && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">😊 Ekspresi / Suasana Hati</label>
                      <input
                        type="text"
                        value={imageExtras.expression}
                        onChange={e => setImageExtras({ ...imageExtras, expression: e.target.value })}
                        placeholder="misal: Bahagia & khusyuk, Penasaran, Semangat, Tenang"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400 focus:ring-purple-400"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Karena karakter faceless, ekspresi akan digambarkan lewat bahasa tubuh & postur.</p>
                    </div>
                  )}

                  {/* Latar */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">🏡 Latar / Setting</label>
                    <input
                      type="text"
                      value={imageExtras.setting}
                      onChange={e => setImageExtras({ ...imageExtras, setting: e.target.value })}
                      placeholder="misal: Masjid, Ruang keluarga, Taman islami, Sekolah"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400 focus:ring-purple-400"
                    />
                  </div>

                  {/* Palet Warna */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">🎨 Palet Warna Dominan</label>
                    <input
                      type="text"
                      value={imageExtras.colorPalette}
                      onChange={e => setImageExtras({ ...imageExtras, colorPalette: e.target.value })}
                      placeholder="misal: Hijau & Emas, Biru Langit & Putih, Netral Hangat"
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:border-purple-400 focus:ring-purple-400"
                    />
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
