"use client";

import { useState, useEffect } from "react";
import { CheckCircle, Save, Sparkles, Plus, Trash2, ArrowRight, BookOpen, Lightbulb, MessageCircle, Info, X, GripVertical, ArrowUp, ArrowDown, Image, Video, UserCircle } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { createContent, fetchEditorNodes, fetchEditorTags } from "@/lib/api";

type ContentTypeOption = "PEMBELAJARAN" | "QNA" | "ARTICLE";
type BlockType = "paragraph" | "quick_answer" | "dialog" | "dalil" | "analogy" | "tip" | "image" | "video";

interface EditorBlock {
  id: string;
  type: BlockType;
  data: any;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: any; color: string }[] = [
  { type: "paragraph", label: "Isi Konten", icon: "📝", color: "bg-slate-100 text-slate-700" },
  { type: "quick_answer", label: "Jawaban Instan", icon: "💡", color: "bg-emerald-100 text-emerald-700" },
  { type: "dialog", label: "Simulasi Dialog", icon: "💬", color: "bg-amber-100 text-amber-700" },
  { type: "dalil", label: "Dalil/Landasan", icon: "📖", color: "bg-orange-100 text-orange-700" },
  { type: "analogy", label: "Analogi Sederhana", icon: "🧩", color: "bg-teal-100 text-teal-700" },
  { type: "tip", label: "Catatan/Tips", icon: "ℹ️", color: "bg-sky-100 text-sky-700" },
  { type: "image", label: "Gambar (Upload)", icon: "🖼️", color: "bg-pink-100 text-pink-700" },
  { type: "video", label: "Video (URL)", icon: "🎬", color: "bg-purple-100 text-purple-700" },
];

function genId() { return Math.random().toString(36).substring(2, 9); }

function defaultData(type: BlockType): any {
  switch (type) {
    case "paragraph": return { text: "" };
    case "quick_answer": return { text: "" };
    case "dialog": return { role: "anak", text: "" };
    case "dalil": return { arabic: "", translation: "", source: "" };
    case "analogy": return { title: "", text: "" };
    case "tip": return { text: "" };
    case "image": return { url: "", caption: "", file: null };
    case "video": return { url: "", caption: "" };
  }
}

export default function EditorPage() {
  const [contentType, setContentType] = useState<ContentTypeOption>("QNA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ageGroup, setAgeGroup] = useState("3-5");
  const [nodeId, setNodeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayAuthorName, setDisplayAuthorName] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const token = Cookies.get("access_token");
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (token) {
      fetchEditorNodes(token).then(r => setNodes(flattenNodes(r.data || []))).catch(() => {});
      fetchEditorTags(token).then(r => setAvailableTags(r.data || [])).catch(() => {});
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

  const isSuperAdmin = user?.role === "SUPERADMIN";

  const addBlock = (type: BlockType) => {
    setBlocks([...blocks, { id: genId(), type, data: defaultData(type) }]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const updateBlock = (id: string, data: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, data: { ...b.data, ...data } } : b));
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags([...tags, t]); setTagInput(""); }
  };

  const handleImageUpload = async (blockId: string, file: File) => {
    const token = Cookies.get("access_token");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${API}/editor/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!res.ok) throw new Error("Upload gagal");
      const result = await res.json();
      updateBlock(blockId, { url: result.url });
      toast.success("Gambar berhasil diupload!");
    } catch (e: any) {
      toast.error(e.message || "Upload gagal");
    }
  };

  const handleSave = async () => {
    if (!title) return toast.error("Judul wajib diisi");
    if (contentType === "PEMBELAJARAN" && !nodeId) return toast.error("Kategori pembelajaran wajib dipilih");
    setIsSaving(true);
    const token = Cookies.get("access_token");
    try {
      const apiType = contentType === "PEMBELAJARAN" ? "ARTICLE" : contentType;
      const payload: any = {
        title, description, type: apiType, ageGroup, useAiChecker: useAi, tags,
        nodeId: contentType === "PEMBELAJARAN" ? nodeId : (nodeId || undefined),
        displayAuthorName: isSuperAdmin ? (displayAuthorName || undefined) : undefined,
        articleDetail: { blocks: blocks.map(b => ({ type: b.type, ...b.data })) },
      };
      if (contentType === "QNA") {
        const quickAnswer = blocks.find(b => b.type === "quick_answer");
        const dialogs = blocks.filter(b => b.type === "dialog");
        const dalils = blocks.filter(b => b.type === "dalil");
        const analogies = blocks.filter(b => b.type === "analogy");
        const tips = blocks.filter(b => b.type === "tip");
        payload.qnaDetail = {
          question: title,
          answerQuick: quickAnswer?.data?.text || "",
          dialogBlocks: dialogs.map(b => b.data),
          dalilBlocks: dalils.map(b => b.data),
          analogyBlocks: analogies.map(b => b.data),
          tipsBlocks: tips.map(b => b.data),
        };
      }
      await createContent(payload, token || "");
      toast.success("Draft berhasil disimpan!");
      setTitle(""); setDescription(""); setBlocks([]); setTags([]);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan konten");
    } finally {
      setIsSaving(false);
    }
  };

  const renderBlockEditor = (block: EditorBlock, index: number) => {
    const { id, type, data } = block;
    return (
      <div key={id} className="relative bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
          <GripVertical size={14} className="text-slate-300" />
          <span className="text-xs font-bold text-slate-500 uppercase">{BLOCK_TYPES.find(b => b.type === type)?.icon} {BLOCK_TYPES.find(b => b.type === type)?.label}</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={14} /></button>
            <button onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={14} /></button>
            <button onClick={() => removeBlock(id)} className="p-1 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
          </div>
        </div>
        <div className="p-4">
          {type === "paragraph" && <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Tulis isi konten..." className="w-full border-slate-200 rounded-lg p-3 min-h-[100px] focus:border-emerald-500 focus:ring-emerald-500" />}
          {type === "quick_answer" && <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Jawaban singkat yang langsung dibacakan ke anak..." className="w-full border-slate-200 rounded-lg p-3 min-h-[80px] focus:border-emerald-500 text-lg font-medium bg-emerald-50/50" />}
          {type === "dialog" && (
            <div className={`flex gap-3 ${data.role === "anak" ? "bg-amber-50/50" : "bg-emerald-50/50"} rounded-xl p-3`}>
              <select value={data.role} onChange={e => updateBlock(id, { role: e.target.value })} className="border-slate-200 rounded-lg text-sm p-2 font-bold w-32">
                <option value="anak">👦 Anak</option>
                <option value="ortu">👩 Orang Tua</option>
              </select>
              <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder={data.role === "anak" ? "Pertanyaan anak..." : "Jawaban orang tua..."} className="flex-1 border-slate-200 rounded-lg text-sm p-3 min-h-[60px]" />
            </div>
          )}
          {type === "dalil" && (
            <div className="space-y-2 bg-[#faf8f5] rounded-xl p-3">
              <textarea value={data.arabic} onChange={e => updateBlock(id, { arabic: e.target.value })} placeholder="Teks Arab (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[50px] text-right font-serif text-lg" dir="rtl" />
              <textarea value={data.translation} onChange={e => updateBlock(id, { translation: e.target.value })} placeholder="Terjemahan / isi dalil" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px]" />
              <input type="text" value={data.source} onChange={e => updateBlock(id, { source: e.target.value })} placeholder="Sumber: QS. Al-Baqarah: 43" className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold" />
            </div>
          )}
          {type === "analogy" && (
            <div className="bg-teal-50/50 rounded-xl p-3 space-y-2">
              <input type="text" value={data.title} onChange={e => updateBlock(id, { title: e.target.value })} placeholder="Judul analogi (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold" />
              <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Bayangkan Allah memberi kita hadiah..." className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[80px]" />
            </div>
          )}
          {type === "tip" && <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Tips untuk orang tua..." className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px] bg-sky-50/50" />}
          {type === "image" && (
            <div className="space-y-2">
              {data.url && <img src={data.url} alt="" className="rounded-xl max-h-60 object-cover border border-slate-200" />}
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) handleImageUpload(id, e.target.files[0]); }} className="text-sm" />
              <input type="text" value={data.caption || ""} onChange={e => updateBlock(id, { caption: e.target.value })} placeholder="Keterangan gambar (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2" />
            </div>
          )}
          {type === "video" && (
            <div className="space-y-2">
              <input type="url" value={data.url} onChange={e => updateBlock(id, { url: e.target.value })} placeholder="URL Video (YouTube, dll)" className="w-full border-slate-200 rounded-lg text-sm p-2" />
              <input type="text" value={data.caption || ""} onChange={e => updateBlock(id, { caption: e.target.value })} placeholder="Keterangan video (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tulis Konten ✍️</h1>
          <p className="text-slate-500">Buat konten interaktif — Pembelajaran, Tanya Jawab, atau Artikel.</p>
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
                {(["PEMBELAJARAN", "QNA", "ARTICLE"] as ContentTypeOption[]).map(t => (
                  <button key={t} onClick={() => setContentType(t)} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${contentType === t ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {t === "PEMBELAJARAN" ? "📚 Pembelajaran" : t === "QNA" ? "🗨️ Tanya Jawab" : "📝 Artikel"}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Judul</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul konten..." className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ringkasan konten..." className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500 min-h-[60px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {contentType === "PEMBELAJARAN" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori Pembelajaran <span className="text-rose-500">*</span></label>
                    <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500">
                      <option value="">— Pilih Kategori —</option>
                      {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kelompok Usia</label>
                  <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500">
                    <option value="3-5">3-5 Tahun</option>
                    <option value="5-7">5-7 Tahun</option>
                    <option value="7-10">7-10 Tahun</option>
                  </select>
                </div>
              </div>
              {/* SuperAdmin: Author Disguise */}
              {isSuperAdmin && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2"><UserCircle size={16} className="text-emerald-600" /> Nama Penulis Tampil (Opsional)</label>
                  <input type="text" value={displayAuthorName} onChange={(e) => setDisplayAuthorName(e.target.value)} placeholder="Kosongkan untuk pakai nama asli" className="w-full border border-slate-300 rounded-lg shadow-sm p-2.5 focus:border-emerald-500 focus:ring-emerald-500" />
                  <p className="text-xs text-slate-400 mt-1">Alias ini akan ditampilkan di halaman publik menggantikan nama asli Anda.</p>
                </div>
              )}
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

          {/* Dynamic Content Blocks */}
          <div className="space-y-4">
            {blocks.map((block, index) => renderBlockEditor(block, index))}
            {blocks.length === 0 && (
              <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
                <p className="font-bold text-lg mb-2">Belum ada blok konten</p>
                <p className="text-sm">Klik tombol di bawah untuk mulai menulis.</p>
              </div>
            )}
          </div>

          {/* Add Block Buttons */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Tambah Blok Konten</p>
            <div className="flex flex-wrap gap-2">
              {BLOCK_TYPES.map(bt => (
                <button key={bt.type} onClick={() => addBlock(bt.type)} className={`${bt.color} px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity border border-transparent`}>
                  {bt.icon} {bt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Publikasi</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> Status: Draft</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className={useAi ? "text-amber-500" : "text-slate-300"} /> AI Checker: {useAi ? "Aktif" : "Nonaktif"}</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300" /> Persetujuan: Menunggu</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300" /> Blok: {blocks.length} buah</li>
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
