"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, Wand2, CheckCircle, AlertCircle, ArrowRight, Copy, Sparkles, BookOpen, MessageSquare, GraduationCap, Eye, EyeOff } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { API_BASE_URL, fetchEditorNodes } from "@/lib/api";

type ContentType = "QNA" | "ARTICLE" | "PEMBELAJARAN" | "KISAH";

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ReactNode; desc: string; color: string }[] = [
  { value: "KISAH", label: "Kisah", icon: <BookOpen size={20} />, desc: "Cerita & narasi islami", color: "emerald" },
  { value: "QNA", label: "Tanya Jawab", icon: <MessageSquare size={20} />, desc: "Format tanya jawab", color: "sky" },
  { value: "ARTICLE", label: "Artikel", icon: <FileText size={20} />, desc: "Tulisan informatif", color: "violet" },
  { value: "PEMBELAJARAN", label: "Pembelajaran", icon: <GraduationCap size={20} />, desc: "Materi edukatif", color: "amber" },
];


const EXAMPLE_FORMAT = `Judul: Judul Konten Anda
Deskripsi: Deskripsi singkat konten
Usia: 3-10
Tag: tag1, tag2, tag3

(opening)
Assalamualaikum warahmatullahi wabarakatuh...

(paragraph)
Isi konten paragraf pertama...

(dalil)
Arab: نص عربي
Terjemahan: Terjemahan bahasa Indonesia
Sumber: QS. Al-Baqarah ayat 1
Sumber URL: https://quran.com/2/1

(analogy)
Judul: Judul Analogi
Penjelasan analogi...

(tip)
Tips atau catatan penting...

(hikmah)
Pelajaran yang bisa diambil...

(doa)
Arab: نص دعاء
Terjemahan: Terjemahan doa
Sumber: HR. Bukhari

(closing)
Wassalamualaikum warahmatullahi wabarakatuh.`;

export default function ImportContentPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [rawContent, setRawContent] = useState("");
  const [type, setType] = useState<ContentType>("KISAH");
  const [kisahNodeId, setKisahNodeId] = useState("");
  const [kisahNodes, setKisahNodes] = useState<any[]>([]);
  const [pov, setPov] = useState<"ORTU" | "ANAK">("ORTU");
  const [loading, setLoading] = useState(false);

  // Fetch KISAH structure nodes dynamically (no hardcoded subTypes)
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
        setKisahNodes(flat(r.data || r || []));
      }).catch(() => {});
    }
  }, []);
  const [showPreview, setShowPreview] = useState(false);
  const [showFormat, setShowFormat] = useState(false);

  // Preview parsing
  const preview = useCallback(() => {
    if (!rawContent.trim()) return null;
    const titleMatch = rawContent.match(/^Judul\s*:\s*(.+)$/im);
    const descMatch = rawContent.match(/^Deskripsi\s*:\s*(.+)$/im);
    const ageMatch = rawContent.match(/^Usia\s*:\s*(.+)$/im);
    const tagMatch = rawContent.match(/^Tag\s*:\s*(.+)$/im);

    const markers: string[] = [];
    const markerRx = /^\s*\((\w+)\)\s*$/gm;
    let m;
    while ((m = markerRx.exec(rawContent)) !== null) {
      const t = m[1].toLowerCase();
      if (['opening', 'closing', 'paragraph', 'heading', 'dalil', 'analogy', 'tip', 'hikmah', 'doa', 'dialog', 'quick_answer'].includes(t)) {
        markers.push(t);
      }
    }

    return {
      title: titleMatch?.[1]?.trim() || null,
      description: descMatch?.[1]?.trim() || null,
      age: ageMatch?.[1]?.trim() || null,
      tags: tagMatch?.[1]?.split(',').map(t => t.trim()).filter(Boolean) || [],
      markers,
      charCount: rawContent.length,
      lineCount: rawContent.split('\n').length,
    };
  }, [rawContent]);

  const previewData = preview();

  const handleImport = async () => {
    if (!rawContent.trim()) {
      toast.error("Teks konten tidak boleh kosong");
      return;
    }
    if (rawContent.trim().length < 50) {
      toast.error("Konten terlalu pendek (minimum 50 karakter)");
      return;
    }

    const token = Cookies.get("_at");
    if (!token) {
      toast.error("Sesi login habis. Silakan login ulang.");
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        rawContent: rawContent.trim(),
        type,
        title: previewData?.title || "Konten Baru",
      };
      if (type === "KISAH" && kisahNodeId) body.nodeId = kisahNodeId;
      if (type === "ARTICLE") body.pov = pov;

      const res = await fetch(`${API_BASE_URL}/admin/import-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }

      const data = await res.json();
      if (data.success && data.data?.id) {
        toast.success(`Konten "${data.data.title}" berhasil diimport!`);
        router.push(`/admin/editor?id=${data.data.id}`);
      } else {
        throw new Error(data.message || "Gagal menyimpan konten");
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal mengimport konten");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setRawContent(text);
        toast.success("Teks berhasil di-paste dari clipboard");
      }
    } catch {
      toast.error("Gagal membaca clipboard. Paste manual dengan Ctrl+V");
    }
  };

  const markerLabel: Record<string, { label: string; emoji: string; color: string }> = {
    opening: { label: "Pembukaan", emoji: "🎙️", color: "bg-indigo-100 text-indigo-700" },
    closing: { label: "Penutup", emoji: "🏁", color: "bg-indigo-100 text-indigo-700" },
    paragraph: { label: "Isi Konten", emoji: "📝", color: "bg-emerald-100 text-emerald-700" },
    heading: { label: "Heading", emoji: "📋", color: "bg-slate-100 text-slate-700" },
    dalil: { label: "Dalil", emoji: "📖", color: "bg-amber-100 text-amber-700" },
    analogy: { label: "Analogi", emoji: "🧩", color: "bg-purple-100 text-purple-700" },
    tip: { label: "Tips", emoji: "ℹ️", color: "bg-cyan-100 text-cyan-700" },
    hikmah: { label: "Hikmah", emoji: "✨", color: "bg-yellow-100 text-yellow-700" },
    doa: { label: "Doa", emoji: "🤲", color: "bg-green-100 text-green-700" },
    dialog: { label: "Dialog", emoji: "💬", color: "bg-rose-100 text-rose-700" },
    quick_answer: { label: "Jawaban", emoji: "⚡", color: "bg-orange-100 text-orange-700" },
  };

  const colorMap: Record<string, string> = {
    emerald: "from-emerald-500 to-teal-500 border-emerald-200 bg-emerald-50 text-emerald-700",
    sky: "from-sky-500 to-blue-500 border-sky-200 bg-sky-50 text-sky-700",
    violet: "from-violet-500 to-purple-500 border-violet-200 bg-violet-50 text-violet-700",
    amber: "from-amber-500 to-orange-500 border-amber-200 bg-amber-50 text-amber-700",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Upload size={22} />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800">Import Konten AI</h1>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed max-w-lg">
            Paste output AI (Gemini/ChatGPT) langsung di sini. Sistem akan otomatis mendeteksi blok konten dan menyimpannya ke editor.
          </p>
        </div>
      </div>

      {/* Step 1: Pilih Tipe */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold">1</span>
          Pilih Tipe Konten
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CONTENT_TYPES.map(ct => {
            const active = type === ct.value;
            const colors = colorMap[ct.color];
            return (
              <button
                key={ct.value}
                onClick={() => setType(ct.value)}
                className={`relative p-4 rounded-2xl border-2 transition-all text-left ${
                  active
                    ? `border-${ct.color}-300 bg-${ct.color}-50 shadow-md shadow-${ct.color}-500/10`
                    : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm"
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                  active ? `bg-gradient-to-br ${colors.split(' ').slice(0, 2).join(' ')} text-white shadow-md` : "bg-slate-100 text-slate-400"
                }`}>
                  {ct.icon}
                </div>
                <p className={`text-sm font-bold ${active ? "text-slate-800" : "text-slate-600"}`}>{ct.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ct.desc}</p>
                {active && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle size={18} className="text-emerald-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-kategori Kisah — dari "Kelola Struktur Kisah" */}
        {type === "KISAH" && (
          <div className="mt-2 pl-8">
            <select
              value={kisahNodeId}
              onChange={(e) => setKisahNodeId(e.target.value)}
              className="w-full max-w-md border border-emerald-200 rounded-xl p-2.5 text-sm font-medium text-slate-800 bg-white focus:border-emerald-500 focus:ring-emerald-500"
            >
              <option value="">— Pilih Sub-Kategori Kisah —</option>
              {kisahNodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
            </select>
            <p className="text-xs text-emerald-600 mt-1">📋 Sub-kategori dikelola di &quot;Kelola Struktur Kisah&quot;</p>
          </div>
        )}

        {/* POV for Article */}
        {type === "ARTICLE" && (
          <div className="flex gap-2 mt-2 pl-8">
            {[
              { value: "ORTU" as const, label: "Perspektif Orang Tua", emoji: "👨‍👩‍👧" },
              { value: "ANAK" as const, label: "Perspektif Anak", emoji: "👦" },
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPov(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  pov === p.value
                    ? "bg-violet-100 text-violet-700 border border-violet-200"
                    : "bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                {p.emoji} {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Paste Content */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold">2</span>
            Paste Output AI
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFormat(!showFormat)}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              <Wand2 size={14} />
              {showFormat ? "Tutup Format" : "Lihat Format"}
            </button>
            <button
              onClick={handlePaste}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-xs font-bold border border-emerald-100"
            >
              <Copy size={14} />
              Paste dari Clipboard
            </button>
          </div>
        </div>

        {/* Format Reference */}
        {showFormat && (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs">
            <p className="font-bold text-slate-700 mb-2">📋 Format yang Diterima:</p>
            <pre className="bg-white rounded-lg p-3 border border-slate-100 text-slate-600 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] max-h-60 overflow-y-auto">
              {EXAMPLE_FORMAT}
            </pre>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            placeholder="Paste seluruh output AI di sini...&#10;&#10;Contoh:&#10;Judul: Sepeda Rusak dan Air Mata Fatih&#10;Deskripsi: Fatih selalu marah...&#10;&#10;(opening)&#10;Assalamualaikum...&#10;&#10;(paragraph)&#10;Isi konten..."
            rows={14}
            className="w-full rounded-xl border-2 border-slate-200 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 p-4 text-sm text-slate-700 font-mono resize-y transition-all placeholder:text-slate-300 outline-none"
          />
          {rawContent && (
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 bg-white/80 backdrop-blur px-2 py-1 rounded-md">
                {previewData?.charCount?.toLocaleString()} karakter • {previewData?.lineCount} baris
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Step 3: Preview */}
      {previewData && previewData.markers.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold">3</span>
              Preview Parsing
            </h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? "Sembunyikan" : "Tampilkan"}
            </button>
          </div>

          {/* Metadata summary — always visible */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-16">Judul</span>
                <span className={`text-sm font-bold ${previewData.title ? "text-slate-800" : "text-rose-400"}`}>
                  {previewData.title || "⚠️ Tidak ditemukan"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-16">Usia</span>
                <span className={`text-sm font-medium ${previewData.age ? "text-slate-700" : "text-slate-400"}`}>
                  {previewData.age || "—"}
                </span>
              </div>
            </div>
            {previewData.description && (
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-16 pt-0.5">Desc</span>
                <span className="text-xs text-slate-600 leading-relaxed">{previewData.description}</span>
              </div>
            )}
            {previewData.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-16">Tags</span>
                {previewData.tags.map(t => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Marker blocks */}
          {showPreview && (
            <div className="flex flex-wrap gap-2">
              {previewData.markers.map((m, i) => {
                const info = markerLabel[m] || { label: m, emoji: "❓", color: "bg-slate-100 text-slate-700" };
                return (
                  <div key={`${m}-${i}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${info.color}`}>
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Warnings */}
          {!previewData.title && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Judul tidak ditemukan.</strong> Tambahkan baris <code className="bg-amber-100 px-1 rounded">Judul: ...</code> di awal teks, atau judul akan diset otomatis.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleImport}
          disabled={loading || !rawContent.trim()}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-base transition-all ${
            loading || !rawContent.trim()
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 active:scale-[0.98]"
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Memproses...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Parse & Buat Konten
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>

      {/* Info footer */}
      <div className="text-center text-xs text-slate-400 leading-relaxed pb-4">
        Setelah import, konten akan tersimpan sebagai <strong>DRAFT</strong> dan langsung dibuka di editor untuk review.
      </div>
    </div>
  );
}
