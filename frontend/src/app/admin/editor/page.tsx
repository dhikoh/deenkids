"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Save, Sparkles, AlertCircle, Plus, Trash2, ArrowRight, BookOpen, Lightbulb, MessageCircle, Info, X } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { createContent, fetchAUTHORNodes, fetchAUTHORTags } from "@/lib/api";

interface DialogBlock { role: "anak" | "ortu"; text: string }
interface DalilBlock { arabic: string; translation: string; source: string }
interface AnalogyBlock { title: string; text: string }
interface TipBlock { text: string }

export default function AUTHORPage() {
  const [contentType, setContentType] = useState<"QNA" | "ARTICLE">("QNA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ageGroup, setAgeGroup] = useState("3-5");
  const [nodeId, setNodeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // QNA fields
  const [answerQuick, setAnswerQuick] = useState("");
  const [dialogBlocks, setDialogBlocks] = useState<DialogBlock[]>([{ role: "anak", text: "" }]);
  const [dalilBlocks, setDalilBlocks] = useState<DalilBlock[]>([]);
  const [analogyBlocks, setAnalogyBlocks] = useState<AnalogyBlock[]>([]);
  const [tipsBlocks, setTipsBlocks] = useState<TipBlock[]>([]);

  // Article fields
  const [articleBlocks, setArticleBlocks] = useState<any[]>([]);

  // Data from API
  const [nodes, setNodes] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) {
      fetchAUTHORNodes(token).then(r => setNodes(flattenNodes(r.data || []))).catch(() => {});
      fetchAUTHORTags(token).then(r => setAvailableTags(r.data || [])).catch(() => {});
    }
  }, []);

  const flattenNodes = (tree: any[], prefix = ""): any[] => {
    let result: any[] = [];
    for (const node of tree) {
      const label = prefix ? `${prefix} > ${node.title}` : node.title;
      result.push({ id: node.id, label, type: node.type });
      if (node.children?.length) result = result.concat(flattenNodes(node.children, label));
    }
    return result;
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  };

  const handleSave = async () => {
    if (!title) return toast.error("Judul wajib diisi");
    if (!nodeId) return toast.error("Pilih kategori kurikulum");
    setIsSaving(true);
    const token = Cookies.get("access_token");
    try {
      const payload: any = {
        title, description, type: contentType, nodeId, ageGroup, useAiChecker: useAi, tags,
      };
      if (contentType === "QNA") {
        payload.qnaDetail = { question: title, answerQuick, dialogBlocks, dalilBlocks, analogyBlocks, tipsBlocks };
      } else {
        payload.articleDetail = { blocks: articleBlocks };
      }
      await createContent(payload, token || "");
      toast.success("Draft berhasil disimpan!");
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan konten");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Block AUTHOR CMS</h1>
          <p className="text-slate-500">Buat konten interaktif — Tanya Jawab atau Artikel.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
            <span className="text-sm font-medium flex items-center gap-1"><Sparkles className="h-4 w-4 text-amber-500" /> AI Checker</span>
          </label>
          <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70">
            <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Draft"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Informasi Utama</h2>
            <div className="space-y-4">
              {/* Content Type Selector */}
              <div className="flex gap-3">
                {(["QNA", "ARTICLE"] as const).map(t => (
                  <button key={t} onClick={() => setContentType(t)} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${contentType === t ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {t === "QNA" ? "🗨️ Tanya Jawab" : "📝 Artikel"}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">{contentType === "QNA" ? "Judul Pertanyaan" : "Judul Artikel"}</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={contentType === "QNA" ? "Contoh: Apakah Allah melihat saat aku sembunyi?" : "Contoh: Pentingnya Mengajarkan Tauhid Sejak Dini"} className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ringkasan konten..." className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori Kurikulum</label>
                  <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500">
                    <option value="">— Pilih Kategori —</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kelompok Usia</label>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500">
                    <option value="3-5">3-5 Tahun</option>
                    <option value="5-7">5-7 Tahun</option>
                    <option value="7-10">7-10 Tahun</option>
                  </select>
                </div>
              </div>
              {/* Tags */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tag</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((t, i) => (
                    <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-100">
                      #{t} <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="text-emerald-400 hover:text-rose-500"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Ketik tag lalu Enter" className="flex-1 border border-slate-300 rounded-lg shadow-sm p-2 text-sm focus:border-emerald-500" list="tag-suggestions" />
                  <datalist id="tag-suggestions">{availableTags.map(t => <option key={t.id} value={t.name} />)}</datalist>
                  <button onClick={addTag} className="px-3 py-2 bg-slate-100 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200"><Plus size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          {/* QNA BLOCKS */}
          {contentType === "QNA" && (
            <>
              {/* 1. Quick Answer */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-0.5 rounded-2xl">
                <div className="bg-white rounded-[14px] p-6">
                  <h2 className="text-sm font-extrabold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2"><Lightbulb size={16} /> Jawaban Instan (Langsung Bacakan)</h2>
                  <textarea value={answerQuick} onChange={(e) => setAnswerQuick(e.target.value)} placeholder="Tuliskan jawaban singkat yang bisa langsung dibacakan ke anak..." className="w-full border border-slate-200 rounded-lg p-3 min-h-[100px] focus:border-emerald-500 focus:ring-emerald-500 text-lg font-medium" />
                </div>
              </div>

              {/* 2. Dialog */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={18} className="text-emerald-600" /> Simulasi Dialog Mengalir</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setDialogBlocks([...dialogBlocks, { role: "anak", text: "" }])} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 flex items-center gap-1"><Plus size={14} /> Anak</button>
                    <button onClick={() => setDialogBlocks([...dialogBlocks, { role: "ortu", text: "" }])} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 flex items-center gap-1"><Plus size={14} /> Orang Tua</button>
                  </div>
                </div>
                <div className="space-y-3">
                  {dialogBlocks.map((block, i) => (
                    <div key={i} className={`flex gap-3 p-3 rounded-xl border ${block.role === "anak" ? "bg-amber-50/50 border-amber-100" : "bg-emerald-50/50 border-emerald-100"}`}>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${block.role === "anak" ? "bg-amber-200" : "bg-emerald-200"}`}>{block.role === "anak" ? "👦" : "👩"}</div>
                      <div className="flex-1 relative">
                        <textarea value={block.text} onChange={(e) => { const n = [...dialogBlocks]; n[i].text = e.target.value; setDialogBlocks(n); }} placeholder={block.role === "anak" ? "Pertanyaan anak..." : "Jawaban orang tua..."} className="w-full border-slate-200 rounded-lg text-sm p-3 min-h-[70px] focus:border-emerald-500 pr-10" />
                        <button onClick={() => setDialogBlocks(dialogBlocks.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                  {dialogBlocks.length === 0 && <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">Belum ada dialog. Klik tombol di atas.</div>}
                </div>
              </div>

              {/* 3. Analogi */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Lightbulb size={18} className="text-amber-500" /> Analogi Sederhana</h2>
                  <button onClick={() => setAnalogyBlocks([...analogyBlocks, { title: "", text: "" }])} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 flex items-center gap-1"><Plus size={14} /> Tambah</button>
                </div>
                <div className="space-y-3">
                  {analogyBlocks.map((a, i) => (
                    <div key={i} className="p-4 bg-amber-50 border border-amber-100 rounded-xl relative">
                      <button onClick={() => setAnalogyBlocks(analogyBlocks.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                      <input type="text" value={a.title} onChange={(e) => { const n = [...analogyBlocks]; n[i].title = e.target.value; setAnalogyBlocks(n); }} placeholder="Judul analogi (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2 mb-2 font-bold" />
                      <textarea value={a.text} onChange={(e) => { const n = [...analogyBlocks]; n[i].text = e.target.value; setAnalogyBlocks(n); }} placeholder="Bayangkan Allah memberi kita hadiah mainan yang sangat banyak..." className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[80px]" />
                    </div>
                  ))}
                  {analogyBlocks.length === 0 && <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">Belum ada analogi.</div>}
                </div>
              </div>

              {/* 4. Dalil / Landasan Syar'i */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><BookOpen size={18} className="text-amber-600" /> Landasan Syar&apos;i</h2>
                  <button onClick={() => setDalilBlocks([...dalilBlocks, { arabic: "", translation: "", source: "" }])} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 flex items-center gap-1"><Plus size={14} /> Tambah Dalil</button>
                </div>
                <div className="space-y-4">
                  {dalilBlocks.map((d, i) => (
                    <div key={i} className="p-4 bg-[#faf8f5] border border-[#e6dfd1] rounded-xl relative space-y-2">
                      <button onClick={() => setDalilBlocks(dalilBlocks.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                      <textarea value={d.arabic} onChange={(e) => { const n = [...dalilBlocks]; n[i].arabic = e.target.value; setDalilBlocks(n); }} placeholder="Teks Arab (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[50px] text-right font-serif text-lg" dir="rtl" />
                      <textarea value={d.translation} onChange={(e) => { const n = [...dalilBlocks]; n[i].translation = e.target.value; setDalilBlocks(n); }} placeholder="Terjemahan / isi dalil" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px]" />
                      <input type="text" value={d.source} onChange={(e) => { const n = [...dalilBlocks]; n[i].source = e.target.value; setDalilBlocks(n); }} placeholder="Sumber: QS. Al-Baqarah: 43 / HR. Bukhari No. 1234" className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold" />
                    </div>
                  ))}
                  {dalilBlocks.length === 0 && <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">Belum ada dalil.</div>}
                </div>
              </div>

              {/* 5. Tips */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Info size={18} className="text-slate-500" /> Catatan Redaksi (Tips)</h2>
                  <button onClick={() => setTipsBlocks([...tipsBlocks, { text: "" }])} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 flex items-center gap-1"><Plus size={14} /> Tambah</button>
                </div>
                <div className="space-y-2">
                  {tipsBlocks.map((tip, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-emerald-500 font-bold mt-2">•</span>
                      <textarea value={tip.text} onChange={(e) => { const n = [...tipsBlocks]; n[i].text = e.target.value; setTipsBlocks(n); }} placeholder="Tips untuk orang tua..." className="flex-1 border-slate-200 rounded-lg text-sm p-2 min-h-[50px]" />
                      <button onClick={() => setTipsBlocks(tipsBlocks.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500 mt-2"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {tipsBlocks.length === 0 && <div className="text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">Belum ada tips.</div>}
                </div>
              </div>
            </>
          )}

          {/* ARTICLE BLOCKS */}
          {contentType === "ARTICLE" && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-bold text-slate-800">Blok Artikel</h2>
                <div className="flex gap-2">
                  {["heading", "paragraph", "dalil", "tip"].map(t => (
                    <button key={t} onClick={() => setArticleBlocks([...articleBlocks, { type: t, text: "" }])} className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 capitalize">{t === "dalil" ? "Dalil" : t === "tip" ? "Tips" : t === "heading" ? "Heading" : "Paragraf"}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {articleBlocks.map((block, i) => (
                  <div key={i} className="relative">
                    <span className="absolute top-2 left-2 text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{block.type}</span>
                    <button onClick={() => setArticleBlocks(articleBlocks.filter((_, j) => j !== i))} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500"><Trash2 size={16} /></button>
                    <textarea value={block.text} onChange={(e) => { const n = [...articleBlocks]; n[i].text = e.target.value; setArticleBlocks(n); }} className={`w-full border rounded-lg p-3 pt-8 min-h-[80px] ${block.type === "heading" ? "font-bold text-lg border-slate-300" : block.type === "dalil" ? "border-amber-200 bg-amber-50 italic" : block.type === "tip" ? "border-emerald-200 bg-emerald-50" : "border-slate-200"}`} placeholder={block.type === "heading" ? "Judul Bagian" : block.type === "dalil" ? "Dalil / Ayat / Hadits..." : block.type === "tip" ? "💡 Tips..." : "Tulis paragraf..."} />
                  </div>
                ))}
                {articleBlocks.length === 0 && <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">Klik tombol di atas untuk menambah blok konten.</div>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Publikasi</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> Status: Draft</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className={useAi ? "text-amber-500" : "text-slate-300"} /> AI Checker: {useAi ? "Aktif" : "Nonaktif"}</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300" /> Persetujuan: Menunggu</li>
            </ul>
            <button onClick={handleSave} disabled={isSaving} className="w-full bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              Simpan & Ajukan Review <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
