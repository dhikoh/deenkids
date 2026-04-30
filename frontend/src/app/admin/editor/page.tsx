"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Save, Sparkles, Plus, Trash2, ArrowRight, BookOpen, Lightbulb, MessageCircle, Info, X, GripVertical, ArrowUp, ArrowDown, Image, Video, UserCircle, AlertTriangle, Clock, Volume2, VolumeX, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { createContent, fetchEditorNodes, fetchEditorTags, fetchAiToggle, API_BASE_URL } from "@/lib/api";

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
    case "dialog": return { lines: [{ role: "anak", text: "" }] };
    case "dalil": return { entries: [{ arabic: "", translation: "", source: "" }] };
    case "analogy": return { title: "", text: "" };
    case "tip": return { text: "" };
    case "image": return { url: "", caption: "", file: null };
    case "video": return { url: "", caption: "" };
  }
}

const AUTO_SAVE_KEY = "adably_editor_draft";

function EditorContent() {
  const [contentType, setContentType] = useState<ContentTypeOption>("QNA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ageGroups, setAgeGroups] = useState<string[]>(["3-5"]);
  const [nodeId, setNodeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [aiGlobalEnabled, setAiGlobalEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayAuthorName, setDisplayAuthorName] = useState("");
  const [enableAudio, setEnableAudio] = useState(false);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = Cookies.get("access_token");
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (token) {
      fetchEditorNodes(token).then(r => setNodes(flattenNodes(r.data || []))).catch(() => {});
      fetchEditorTags(token).then(r => setAvailableTags(r.data || [])).catch(() => {});
      // Fetch AI global toggle
      fetchAiToggle(token).then(r => { setAiGlobalEnabled(r.aiEnabled); if (!r.aiEnabled) setUseAi(false); }).catch(() => {});
      // Check localStorage for auto-draft recovery (3 month expiry)
      if (!searchParams.get("id")) {
        const saved = localStorage.getItem(AUTO_SAVE_KEY);
        if (saved) {
          try {
            const d = JSON.parse(saved);
            const savedDate = new Date(d.savedAt);
            const now = new Date();
            const diffDays = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (d.title && diffDays <= 90) {
              setShowRecovery(true);
            } else if (diffDays > 90) {
              localStorage.removeItem(AUTO_SAVE_KEY);
            }
          } catch {}
        }
      }
      // Edit mode: load existing content
      const id = searchParams.get("id");
      if (id) {
        setEditId(id);
        fetch(`${API_BASE_URL}/editor/content/${id}`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(res => {
            const c = res.data;
            if (c) {
              setTitle(c.title || ""); setDescription(c.description || "");
              setAgeGroups(c.ageGroups || c.ageGroup ? [c.ageGroup] : ["3-5"]); setNodeId(c.nodeId || "");
              setDisplayAuthorName(c.displayAuthorName || "");
              setTags(c.tags?.map((t: any) => t.tag?.name || t.name).filter(Boolean) || []);
              const cType = c.type === "PEMBELAJARAN" ? "PEMBELAJARAN" : c.type === "QNA" ? "QNA" : "ARTICLE";
              setContentType(cType);
              // Load blocks from articleDetail or qnaDetail
              const loadedBlocks: EditorBlock[] = [];
              if (c.qnaDetail) {
                if (c.qnaDetail.answerQuick) loadedBlocks.push({ id: genId(), type: "quick_answer", data: { text: c.qnaDetail.answerQuick } });
                (c.qnaDetail.dialogBlocks || []).forEach((d: any) => {
                  const lines = d.lines || [{ role: d.role || 'anak', text: d.text || '' }];
                  loadedBlocks.push({ id: genId(), type: "dialog", data: { lines } });
                });
                (c.qnaDetail.dalilBlocks || []).forEach((d: any) => {
                  const entries = d.entries || [{ arabic: d.arabic || '', translation: d.translation || '', source: d.source || '' }];
                  loadedBlocks.push({ id: genId(), type: "dalil", data: { entries } });
                });
                (c.qnaDetail.analogyBlocks || []).forEach((a: any) => loadedBlocks.push({ id: genId(), type: "analogy", data: a }));
                (c.qnaDetail.tipsBlocks || []).forEach((t: any) => loadedBlocks.push({ id: genId(), type: "tip", data: t }));
              }
              if (c.articleDetail?.blocks) {
                (c.articleDetail.blocks as any[]).forEach((b: any) => {
                  const { type, ...data } = b;
                  loadedBlocks.push({ id: genId(), type: type as BlockType, data });
                });
              }
              if (loadedBlocks.length) setBlocks(loadedBlocks);
            }
          }).catch(() => toast.error("Gagal memuat konten untuk edit"));
      }
    }
  }, [searchParams]);

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

  // Auto-save to localStorage every 30s
  useEffect(() => {
    if (editId) return; // Don't auto-save when editing existing content
    const timer = setInterval(() => {
      if (title || blocks.length > 0) {
        const draft = { title, description, contentType, ageGroups, nodeId, tags, blocks, displayAuthorName, useAi, enableAudio, savedAt: new Date().toISOString() };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
        setLastAutoSave(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [title, description, contentType, ageGroups, nodeId, tags, blocks, displayAuthorName, useAi, enableAudio, editId]);

  const recoverDraft = () => {
    try {
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.title) setTitle(d.title);
        if (d.description) setDescription(d.description);
        if (d.contentType) setContentType(d.contentType);
        if (d.ageGroups) setAgeGroups(d.ageGroups);
        if (d.nodeId) setNodeId(d.nodeId);
        if (d.tags) setTags(d.tags);
        if (d.blocks) setBlocks(d.blocks);
        if (d.displayAuthorName) setDisplayAuthorName(d.displayAuthorName);
        if (d.enableAudio !== undefined) setEnableAudio(d.enableAudio);
        toast.success("Draft berhasil dipulihkan!");
      }
    } catch {} finally { setShowRecovery(false); }
  };

  const dismissRecovery = () => {
    localStorage.removeItem(AUTO_SAVE_KEY);
    setShowRecovery(false);
  };

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
      const res = await fetch(`${API_BASE_URL}/editor/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
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
      const payload: any = {
        title, description, type: contentType, ageGroups, useAiChecker: useAi, enableAudio, tags,
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
      if (editId) {
        await fetch(`${API_BASE_URL}/editor/content/${editId}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) }).then(r => { if (!r.ok) throw new Error("Gagal update"); return r.json(); });
        toast.success("Konten berhasil diperbarui!");
      } else {
        const res = await createContent(payload, token || "");
        toast.success("Draft berhasil disimpan!");
        if (res?.data?.id) setEditId(res.data.id);
        localStorage.removeItem(AUTO_SAVE_KEY);
        setTitle(""); setDescription(""); setBlocks([]); setTags([]);
      }
      localStorage.removeItem(AUTO_SAVE_KEY);
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan konten");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitReview = () => {
    setShowTerms(true);
    setTermsAccepted(false);
  };

  const confirmSubmitReview = async () => {
    if (!editId) { toast.error("Simpan konten terlebih dahulu"); return; }
    const token = Cookies.get("access_token");
    try {
      await fetch(`${API_BASE_URL}/editor/content/${editId}/submit`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).then(r => { if (!r.ok) throw new Error(); return r.json(); });
      toast.success("Konten diajukan untuk review!");
      setShowTerms(false);
    } catch { toast.error("Gagal mengajukan review"); }
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
            <div className="space-y-2">
              {(data.lines || []).map((line: any, li: number) => (
                <div key={li} className={`flex gap-2 ${line.role === "anak" ? "bg-amber-50/50" : line.role === "ibu" ? "bg-emerald-50/50" : "bg-blue-50/50"} rounded-xl p-3 items-start`}>
                  <select value={line.role} onChange={e => { const nl = [...data.lines]; nl[li] = { ...nl[li], role: e.target.value }; updateBlock(id, { lines: nl }); }} className="border-slate-200 rounded-lg text-sm p-2 font-bold w-28 shrink-0">
                    <option value="anak">👦 Anak</option>
                    <option value="ibu">👩 Ibu</option>
                    <option value="ayah">👨 Ayah</option>
                  </select>
                  <textarea value={line.text} onChange={e => { const nl = [...data.lines]; nl[li] = { ...nl[li], text: e.target.value }; updateBlock(id, { lines: nl }); }} placeholder={line.role === "anak" ? "Pertanyaan anak..." : "Jawaban orang tua..."} className="flex-1 border-slate-200 rounded-lg text-sm p-2 min-h-[50px]" />
                  {data.lines.length > 1 && <button onClick={() => { const nl = data.lines.filter((_: any, j: number) => j !== li); updateBlock(id, { lines: nl }); }} className="p-1 text-slate-400 hover:text-rose-500 shrink-0"><Trash2 size={14} /></button>}
                </div>
              ))}
              <button onClick={() => updateBlock(id, { lines: [...(data.lines || []), { role: "anak", text: "" }] })} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 px-3 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100"><Plus size={12} /> Tambah Baris Dialog</button>
            </div>
          )}
          {type === "dalil" && (
            <div className="space-y-3">
              {(data.entries || []).map((entry: any, ei: number) => (
                <div key={ei} className="space-y-2 bg-[#faf8f5] rounded-xl p-3 relative">
                  {data.entries.length > 1 && <button onClick={() => { const ne = data.entries.filter((_: any, j: number) => j !== ei); updateBlock(id, { entries: ne }); }} className="absolute top-2 right-2 p-1 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>}
                  <textarea value={entry.arabic} onChange={e => { const ne = [...data.entries]; ne[ei] = { ...ne[ei], arabic: e.target.value }; updateBlock(id, { entries: ne }); }} placeholder="Teks Arab (opsional)" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[50px] text-right font-serif text-lg" dir="rtl" />
                  <textarea value={entry.translation} onChange={e => { const ne = [...data.entries]; ne[ei] = { ...ne[ei], translation: e.target.value }; updateBlock(id, { entries: ne }); }} placeholder="Terjemahan / isi dalil" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px]" />
                  <input type="text" value={entry.source} onChange={e => { const ne = [...data.entries]; ne[ei] = { ...ne[ei], source: e.target.value }; updateBlock(id, { entries: ne }); }} placeholder="Sumber: QS. Al-Baqarah: 43" className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold" />
                </div>
              ))}
              <button onClick={() => updateBlock(id, { entries: [...(data.entries || []), { arabic: "", translation: "", source: "" }] })} className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-100"><Plus size={12} /> Tambah Dalil</button>
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
      {/* Recovery Modal */}
      {showRecovery && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-amber-600" />
            <div>
              <p className="font-bold text-amber-800 text-sm">Draft yang belum tersimpan ditemukan</p>
              <p className="text-xs text-amber-600">Ingin memulihkan draft terakhir? {(() => { try { const s = localStorage.getItem(AUTO_SAVE_KEY); if (s) { const d = JSON.parse(s); return `(Tersimpan: ${new Date(d.savedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })})`; } } catch {} return ''; })()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={recoverDraft} className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600">Pulihkan</button>
            <button onClick={dismissRecovery} className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300">Buang</button>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tulis Konten ✍️</h1>
          <p className="text-slate-500">Buat konten interaktif — Pembelajaran, Tanya Jawab, atau Artikel.</p>
          {lastAutoSave && <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1"><Clock size={12} /> Tersimpan otomatis {lastAutoSave}</p>}
        </div>
        <div className="flex items-center gap-3">
          {aiGlobalEnabled && (
            <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
              <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
              <span className="text-sm font-medium flex items-center gap-1"><Sparkles className="h-4 w-4 text-amber-500" /> AI Checker</span>
            </label>
          )}
          <label className={`flex items-center gap-2 cursor-pointer px-4 py-2 rounded-xl border shadow-sm transition-all ${enableAudio ? "bg-purple-50 border-purple-300" : "bg-white border-slate-200"}`}>
            <input type="checkbox" checked={enableAudio} onChange={(e) => setEnableAudio(e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
            <span className="text-sm font-medium flex items-center gap-1">{enableAudio ? <Volume2 className="h-4 w-4 text-purple-500" /> : <VolumeX className="h-4 w-4 text-slate-400" />} Audio</span>
          </label>
          <button onClick={() => {
            const previewData = { title, description, contentType, ageGroups, blocks, tags, editId, enableAudio, displayAuthorName };
            localStorage.setItem('adably_preview_data', JSON.stringify(previewData));
            window.open('/admin/editor/preview', '_blank');
          }} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
            <Eye size={18} /> Preview
          </button>
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
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Kelompok Usia <span className="text-xs text-slate-400">(bisa lebih dari satu)</span></label>
                  <div className="flex flex-wrap gap-2">
                    {["3-5", "5-7", "7-10", "10-13", "Semua Usia"].map(age => {
                      const ALL_AGES = ["3-5", "5-7", "7-10", "10-13"];
                      const isAllSelected = ALL_AGES.every(a => ageGroups.includes(a));
                      const checked = age === "Semua Usia" ? isAllSelected : ageGroups.includes(age);
                      return (
                        <label key={age} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm font-bold ${checked ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={checked} onChange={() => {
                            if (age === "Semua Usia") {
                              setAgeGroups(isAllSelected ? [] : [...ALL_AGES]);
                            } else {
                              if (ageGroups.includes(age)) {
                                setAgeGroups(ageGroups.filter(a => a !== age));
                              } else {
                                setAgeGroups([...ageGroups, age]);
                              }
                            }
                          }} className="w-4 h-4 text-emerald-600 rounded" />
                          {age === "Semua Usia" ? age : `${age} Tahun`}
                        </label>
                      );
                    })}
                  </div>
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
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-emerald-500" /> Mode: {editId ? "Edit" : "Baru"}</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className={useAi ? "text-amber-500" : "text-slate-300"} /> AI Checker: {useAi ? "Aktif" : "Nonaktif"}</li>
              <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300" /> Blok: {blocks.length} buah</li>
            </ul>
            <div className="space-y-2">
              <button onClick={handleSave} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Draft"}
              </button>
              {editId && (
                <button onClick={handleSubmitReview} className="w-full bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                  Ajukan Review <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      {showTerms && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center gap-3">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-extrabold">Ketentuan Penerbitan Konten</h3>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-700 leading-relaxed">Dengan mengajukan konten ini untuk ditinjau, saya menyatakan:</p>
              <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside">
                <li>Konten yang saya tulis bersumber dari <span className="font-bold text-slate-800">Al-Quran dan Hadits Shahih</span> sesuai pemahaman Salafus Shalih.</li>
                <li>Saya tidak mencantumkan hadits dha&apos;if atau maudhu&apos; tanpa keterangan status hadits.</li>
                <li>Konten tidak mengandung unsur SARA, ujaran kebencian, atau fitnah terhadap individu/kelompok manapun.</li>
                <li>Saya memberikan hak kepada <span className="font-bold">Adably</span> untuk mengedit, merevisi, atau menghapus konten jika dianggap perlu oleh tim editorial.</li>
                <li>Konten yang sudah dipublikasikan menjadi milik bersama Adably dan tidak dapat ditarik sepihak oleh penulis.</li>
                <li>Adably berhak mengubah nama penulis yang ditampilkan (alias) demi kepentingan editorial.</li>
              </ol>
              <label className="flex items-start gap-3 bg-emerald-50 p-4 rounded-xl border border-emerald-100 cursor-pointer">
                <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)} className="w-5 h-5 text-emerald-600 rounded mt-0.5" />
                <span className="text-sm font-bold text-emerald-800">Saya menyetujui ketentuan di atas.</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-100">
              <button onClick={() => setShowTerms(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-sm">Batalkan</button>
              <button onClick={confirmSubmitReview} disabled={!termsAccepted} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm disabled:opacity-50">Ajukan Review</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Memuat editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
