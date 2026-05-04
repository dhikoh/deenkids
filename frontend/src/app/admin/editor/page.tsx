"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Save, Sparkles, Plus, Trash2, ArrowRight, BookOpen, Lightbulb, MessageCircle, Info, X, GripVertical, ArrowUp, ArrowDown, Image, Video, UserCircle, AlertTriangle, Clock, Volume2, VolumeX, Eye } from "lucide-react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { createContent, fetchEditorNodes, fetchEditorTags, fetchAiToggle, submitContentForReview, apiFetch, authHeaders, API_BASE_URL } from "@/lib/api";
import ImageCropperModal from "@/components/ImageCropperModal";

type ContentTypeOption = "PEMBELAJARAN" | "QNA" | "ARTICLE" | "KISAH";
type BlockType = "paragraph" | "quick_answer" | "dialog" | "dalil" | "analogy" | "tip" | "hikmah" | "doa" | "image" | "video";

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
  { type: "hikmah", label: "Hikmah / Pelajaran", icon: "✨", color: "bg-violet-100 text-violet-700" },
  { type: "doa", label: "Doa", icon: "🤲", color: "bg-indigo-100 text-indigo-700" },
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
    case "hikmah": return { text: "" };
    case "doa": return { title: "", arabic: "", translation: "", source: "" };
    case "image": return { url: "", caption: "", file: null };
    case "video": return { url: "", caption: "" };
  }
}

const AUTO_SAVE_KEY = "adably_editor_draft";

function EditorContent() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentTypeOption>("QNA");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const ALL_AGE_GROUPS = ["3-5", "5-7", "7-10", "10-13"];
  const [ageGroups, setAgeGroups] = useState<string[]>([...ALL_AGE_GROUPS]);
  const [nodeId, setNodeId] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [aiGlobalEnabled, setAiGlobalEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [displayAuthorName, setDisplayAuthorName] = useState("");
  const [enableAudio, setEnableAudio] = useState(false);
  const [pov, setPov] = useState(""); // 'ORTU' | 'ANAK' | '' — hanya untuk ARTICLE
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [cropperSrc, setCropperSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [blocks, setBlocks] = useState<EditorBlock[]>([]);
  const [nodes, setNodes] = useState<any[]>([]);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = Cookies.get("_at");
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    if (token) {
      fetchEditorNodes(token, 'PEMBELAJARAN').then(r => setNodes(flattenNodes(r.data || []))).catch(() => {});
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
              setAgeGroups(c.type === 'KISAH' ? [...ALL_AGE_GROUPS] : (c.ageGroups && c.ageGroups.length > 0 ? c.ageGroups : [...ALL_AGE_GROUPS])); setNodeId(c.nodeId || "");
              setDisplayAuthorName(c.displayAuthorName || "");
              setEnableAudio(c.enableAudio ?? false);
              setThumbnailUrl(c.thumbnailUrl || "");
              setEditStatus(c.status || null);
              setTags(c.tags?.map((t: any) => t.tag?.name || t.name).filter(Boolean) || []);
              const cType: ContentTypeOption = c.type === 'PEMBELAJARAN' ? 'PEMBELAJARAN' : c.type === 'QNA' ? 'QNA' : c.type === 'KISAH' ? 'KISAH' : 'ARTICLE';
              setContentType(cType);
              // Auto-enable audio for KISAH content
              if (c.type === 'KISAH' && c.enableAudio !== false) setEnableAudio(true);
              if (c.type === 'ARTICLE' && c.pov) setPov(c.pov);
              // Load blocks from articleDetail or qnaDetail
              const loadedBlocks: EditorBlock[] = [];
              if (c.qnaDetail) {
                if (c.qnaDetail.answerQuick) {
                  loadedBlocks.push({ id: genId(), type: "quick_answer", data: { text: c.qnaDetail.answerQuick, referenceUrl: c.qnaDetail.answerQuickReferenceUrl || '' } });
                }
                // Load from unified blocks[] (new format)
                if (Array.isArray(c.qnaDetail.blocks) && c.qnaDetail.blocks.length > 0) {
                  (c.qnaDetail.blocks as any[]).forEach((b: any) => {
                    const { type, ...data } = b;
                    if (type) loadedBlocks.push({ id: genId(), type: type as BlockType, data });
                  });
                } else {
                  // Fallback: load from legacy fields (for records not yet migrated)
                  (c.qnaDetail.dialogBlocks || []).forEach((d: any) => {
                    const lines = d.lines || [{ role: d.role || 'anak', text: d.text || '' }];
                    loadedBlocks.push({ id: genId(), type: "dialog", data: { lines } });
                  });
                  (c.qnaDetail.dalilBlocks || []).forEach((d: any) => {
                    const entries = d.entries || [{ arabic: d.arabic || '', translation: d.translation || '', source: d.source || '', sourceUrl: d.sourceUrl || '' }];
                    loadedBlocks.push({ id: genId(), type: "dalil", data: { entries } });
                  });
                  (c.qnaDetail.analogyBlocks || []).forEach((a: any) => loadedBlocks.push({ id: genId(), type: "analogy", data: a }));
                  (c.qnaDetail.tipsBlocks || []).forEach((t: any) => loadedBlocks.push({ id: genId(), type: "tip", data: t }));
                }
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

  // Auto-set semua usia saat tipe diubah ke KISAH (KISAH selalu universal 3-13 thn)
  useEffect(() => {
    if (contentType === 'KISAH') setAgeGroups([...ALL_AGE_GROUPS]);
    if (contentType !== 'ARTICLE') setPov(''); // reset pov jika bukan ARTICLE
  }, [contentType]);

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
        const draft = { title, description, contentType, ageGroups, nodeId, tags, blocks, displayAuthorName, useAi, enableAudio, thumbnailUrl, pov, savedAt: new Date().toISOString() };
        localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(draft));
        setLastAutoSave(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [title, description, contentType, ageGroups, nodeId, tags, blocks, displayAuthorName, useAi, enableAudio, thumbnailUrl, pov, editId]);

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
        if (d.thumbnailUrl) setThumbnailUrl(d.thumbnailUrl);
        if (d.pov && d.contentType === 'ARTICLE') setPov(d.pov);
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
    const token = Cookies.get("_at");
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

  const handleSave = async (targetStatus?: string) => {
    if (!title) return toast.error("Judul wajib diisi");
    if (!ageGroups || ageGroups.length === 0) return toast.error("Kelompok usia wajib dipilih minimal satu");
    if (contentType === "PEMBELAJARAN" && !nodeId) return toast.error("Kategori pembelajaran wajib dipilih");
    if (contentType === "KISAH" && !nodeId) return toast.error("Sub-kategori kisah wajib dipilih");
    setIsSaving(true);
    const token = Cookies.get("_at");
    try {
      const payload: any = {
        title, description, type: contentType, ageGroups, useAiChecker: useAi, enableAudio, tags,
        thumbnailUrl: thumbnailUrl || null,
        nodeId: (contentType === 'PEMBELAJARAN' || contentType === 'KISAH') ? nodeId : (nodeId || undefined),
        displayAuthorName: isSuperAdmin ? (displayAuthorName || undefined) : undefined,
        pov: contentType === 'ARTICLE' ? (pov || null) : undefined,
      };
      // SuperAdmin can set status directly (e.g., PUBLISHED)
      if (isSuperAdmin && targetStatus) {
        payload.status = targetStatus;
      }
      if (contentType !== "QNA") {
        payload.articleDetail = { blocks: blocks.map(b => ({ type: b.type, ...b.data })) };
      }
      if (contentType === "QNA") {
        const quickAnswer = blocks.find(b => b.type === "quick_answer");
        payload.qnaDetail = {
          question: title,
          answerQuick: quickAnswer?.data?.text || "",
          answerQuickReferenceUrl: quickAnswer?.data?.referenceUrl || "",
          // Send all non-quick_answer blocks as unified blocks[]
          blocks: blocks
            .filter(b => b.type !== "quick_answer")
            .map(b => ({ type: b.type, ...b.data })),
        };
      }
      if (editId) {
        await apiFetch(`${API_BASE_URL}/editor/content/${editId}`, { method: "PUT", headers: authHeaders(token || ""), body: JSON.stringify(payload) });
        if (targetStatus === 'PUBLISHED') {
          toast.success("Konten berhasil diterbitkan!");
        } else {
          toast.success("Konten berhasil diperbarui!");
        }
      } else {
        const res = await createContent(payload, token || "");
        if (targetStatus === 'PUBLISHED') {
          toast.success("Konten berhasil dibuat & diterbitkan!");
        } else {
          toast.success("Draft berhasil disimpan!");
        }
        localStorage.removeItem(AUTO_SAVE_KEY);
        // Redirect ke edit mode untuk konten yang baru dibuat
        if (res?.data?.id) {
          router.push(`/admin/editor?id=${res.data.id}`);
          return;
        }
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
    const token = Cookies.get("_at");
    try {
      await submitContentForReview(editId, token || "");
      toast.success("Konten diajukan untuk review!");
      setShowTerms(false);
      // Redirect ke halaman konten saya
      window.location.href = '/admin/my-contents';
    } catch (e: any) { toast.error(e.message || "Gagal mengajukan review"); }
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
          {type === "paragraph" && <div className="space-y-2"><textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Tulis isi konten..." className="w-full border-slate-200 rounded-lg p-3 min-h-[100px] focus:border-emerald-500 focus:ring-emerald-500" /><input type="url" value={data.referenceUrl || ''} onChange={e => updateBlock(id, { referenceUrl: e.target.value })} placeholder="📎 Link referensi (opsional) — https://..." className="w-full border-slate-200 rounded-lg p-2 text-sm text-emerald-700" /></div>}
          {type === "quick_answer" && <div className="space-y-2"><textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Jawaban singkat yang langsung dibacakan ke anak..." className="w-full border-slate-200 rounded-lg p-3 min-h-[80px] focus:border-emerald-500 text-lg font-medium bg-emerald-50/50" /><input type="url" value={data.referenceUrl || ''} onChange={e => updateBlock(id, { referenceUrl: e.target.value })} placeholder="📎 Link referensi (opsional) — https://..." className="w-full border-slate-200 rounded-lg p-2 text-sm text-emerald-700" /></div>}
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
                  <input type="url" value={entry.sourceUrl || ''} onChange={e => { const ne = [...data.entries]; ne[ei] = { ...ne[ei], sourceUrl: e.target.value }; updateBlock(id, { entries: ne }); }} placeholder="🔗 URL sumber (opsional) — https://sunnah.com/..." className="w-full border-slate-200 rounded-lg text-sm p-2 text-emerald-700" />
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
                    {type === "tip" && <div className="space-y-2"><textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Tips untuk orang tua..." className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px] bg-sky-50/50" /><input type="url" value={data.referenceUrl || ''} onChange={e => updateBlock(id, { referenceUrl: e.target.value })} placeholder="📎 Link referensi (opsional) — https://..." className="w-full border-slate-200 rounded-lg p-2 text-sm text-emerald-700" /></div>}
          {type === "hikmah" && (
            <div className="bg-violet-50/50 rounded-xl p-3">
              <textarea value={data.text} onChange={e => updateBlock(id, { text: e.target.value })} placeholder="Hikmah atau pelajaran utama dari konten ini... Tulis refleksi yang menyentuh hati dan relevan." className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[80px]" />
            </div>
          )}
          {type === "doa" && (
            <div className="bg-indigo-50/50 rounded-xl p-3 space-y-2">
              <input type="text" value={data.title} onChange={e => updateBlock(id, { title: e.target.value })} placeholder="Nama doa (opsional) — misal: Doa Memohon Ilmu" className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold" />
              <textarea value={data.arabic} onChange={e => updateBlock(id, { arabic: e.target.value })} placeholder="Teks Arab doa" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[50px] text-right font-serif text-lg" dir="rtl" />
              <textarea value={data.translation} onChange={e => updateBlock(id, { translation: e.target.value })} placeholder="Terjemahan doa" className="w-full border-slate-200 rounded-lg text-sm p-2 min-h-[60px]" />
              <input type="text" value={data.source} onChange={e => updateBlock(id, { source: e.target.value })} placeholder="Sumber — WAJIB: QS. Thaha: 114 atau HR. Bukhari No. ..." className="w-full border-slate-200 rounded-lg text-sm p-2 font-bold text-indigo-700" />
            </div>
          )}
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
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            {editId ? 'Edit Konten ✏️' : 'Tulis Konten ✍️'}
            {editStatus && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                editStatus === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' :
                editStatus === 'REVIEW' ? 'bg-amber-100 text-amber-700' :
                editStatus === 'REVISION' ? 'bg-rose-100 text-rose-700' :
                editStatus === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {editStatus === 'PUBLISHED' ? '✅ Terbit' : editStatus === 'REVIEW' ? '⏳ Menunggu Review' : editStatus === 'REVISION' ? '✏️ Perlu Revisi' : editStatus === 'DRAFT' ? '📝 Draft' : editStatus}
              </span>
            )}
          </h1>
          <p className="text-slate-500">{editId ? 'Perbarui konten yang sudah ada.' : 'Buat konten interaktif — Pembelajaran, Tanya Jawab, atau Artikel.'}</p>
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
          <button onClick={() => handleSave()} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70">
            <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Draft"}
          </button>
          {isSuperAdmin && (
            <button onClick={() => handleSave('PUBLISHED')} disabled={isSaving} className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2 rounded-xl font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-70">
              <Sparkles size={18} /> Terbitkan Langsung
            </button>
          )}
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
              {(["PEMBELAJARAN", "QNA", "ARTICLE", "KISAH"] as ContentTypeOption[]).map(t => (
                <button key={t} onClick={() => {
                  setContentType(t);
                  if (t === 'KISAH') setEnableAudio(true);
                  // Reload nodes for the new content type group
                  const token = Cookies.get('_at');
                  if (token) {
                    const group = t === 'PEMBELAJARAN' ? 'PEMBELAJARAN' : t === 'KISAH' ? 'KISAH' : undefined;
                    fetchEditorNodes(token, group).then(r => setNodes(flattenNodes(r.data || []))).catch(() => {});
                  }
                }} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${contentType === t ? "bg-emerald-600 text-white shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {t === "PEMBELAJARAN" ? "📚 Pembelajaran" : t === "QNA" ? "🗨️ Tanya Jawab" : t === "KISAH" ? "📖 Kisah" : "📝 Artikel"}
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
              {/* Thumbnail Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Thumbnail <span className="text-xs text-slate-400 font-normal">(opsional — untuk card & share preview)</span></label>
                {thumbnailUrl ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                      <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${thumbnailUploading ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                        <Image size={13} /> Ganti & Crop Ulang
                        <input type="file" accept="image/*" className="hidden" disabled={thumbnailUploading} onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 15 * 1024 * 1024) { toast.error('Ukuran maksimal 15MB'); return; }
                          const objectUrl = URL.createObjectURL(file);
                          setCropperSrc(objectUrl);
                          setShowCropper(true);
                          e.target.value = '';
                        }} />
                      </label>
                      <button type="button" onClick={() => setThumbnailUrl("")} className="text-xs font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                        <Trash2 size={13} /> Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-3 cursor-pointer transition-colors ${thumbnailUploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
                    <Image size={20} className="text-slate-400" />
                    <span className="text-sm text-slate-500">{thumbnailUploading ? 'Mengupload...' : 'Pilih gambar → akan otomatis terbuka editor crop (maks 15MB)'}</span>
                    <input type="file" accept="image/*" className="hidden" disabled={thumbnailUploading} onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 15 * 1024 * 1024) { toast.error('Ukuran maksimal 15MB'); return; }
                      const objectUrl = URL.createObjectURL(file);
                      setCropperSrc(objectUrl);
                      setShowCropper(true);
                      e.target.value = '';
                    }} />
                  </label>
                )}
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
                {contentType === "KISAH" && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Sub-Kategori Kisah <span className="text-rose-500">*</span></label>
                    <select value={nodeId} onChange={(e) => setNodeId(e.target.value)} className="w-full border border-amber-300 rounded-lg shadow-sm p-2.5 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/50">
                      <option value="">— Pilih Sub-Kategori Kisah —</option>
                      {nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                    </select>
                    <p className="text-xs text-amber-600 mt-1">💡 Sub-kategori dikelola di "Kelola Struktur Kisah"</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Kelompok Usia <span className="text-xs text-slate-400">(bisa lebih dari satu)</span></label>
                  {contentType === "KISAH" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-sm font-bold">
                        📖 Kisah — Semua Usia (3–13 Tahun)
                      </span>
                      <p className="text-xs text-amber-600">Konten kisah selalu menargetkan semua rentang usia anak.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {["3-5", "5-7", "7-10", "10-13", "Semua Usia"].map(age => {
                        const isAllSelected = ALL_AGE_GROUPS.every(a => ageGroups.includes(a));
                        const checked = age === "Semua Usia" ? isAllSelected : ageGroups.includes(age);
                        return (
                          <label key={age} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all text-sm font-bold ${checked ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                            <input type="checkbox" checked={checked} onChange={() => {
                              if (age === "Semua Usia") {
                                setAgeGroups(isAllSelected ? [] : [...ALL_AGE_GROUPS]);
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
                  )}
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
              {/* POV Artikel — hanya tampil untuk tipe ARTICLE */}
              {contentType === "ARTICLE" && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Sudut Pandang Artikel (POV)</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "", label: "Semua Pembaca", icon: "👥", desc: "Tampil di semua filter" },
                      { value: "ORTU", label: "Orang Tua", icon: "👨‍👩‍👧", desc: "Tips & panduan parenting" },
                      { value: "ANAK", label: "Anak", icon: "👦", desc: "Dari & untuk anak" },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPov(opt.value)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold transition-all ${
                          pov === opt.value
                            ? "border-teal-500 bg-teal-50 text-teal-700"
                            : "border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                        <span className="text-xs font-normal opacity-70">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
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
              {BLOCK_TYPES.filter(bt => {
                // quick_answer only for QNA
                if (bt.type === 'quick_answer' && contentType !== 'QNA') return false;
                // dialog only for QNA (structured dialog is Q&A specific)
                if (bt.type === 'dialog' && contentType !== 'QNA') return false;
                return true;
              }).map(bt => (
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
              <button onClick={() => handleSave()} disabled={isSaving} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                <Save size={16} /> {isSaving ? "Menyimpan..." : "Simpan Draft"}
              </button>
              {isSuperAdmin && (
                <button onClick={() => handleSave('PUBLISHED')} disabled={isSaving} className="w-full bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  <Sparkles size={16} /> Terbitkan Langsung
                </button>
              )}
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

      {/* Image Cropper Modal */}
      {showCropper && cropperSrc && (
        <ImageCropperModal
          imageSrc={cropperSrc}
          onCancel={() => {
            setShowCropper(false);
            URL.revokeObjectURL(cropperSrc);
            setCropperSrc(null);
          }}
          onCropComplete={async (blob) => {
            setShowCropper(false);
            URL.revokeObjectURL(cropperSrc);
            setCropperSrc(null);
            setThumbnailUploading(true);
            try {
              const token = Cookies.get('_at');
              const fd = new FormData();
              fd.append('file', new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' }));
              const res = await fetch(`${API_BASE_URL}/editor/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: fd,
              });
              if (!res.ok) throw new Error('Upload gagal');
              const data = await res.json();
              setThumbnailUrl(data.url);
              toast.success('Thumbnail berhasil di-crop & diupload!');
            } catch (err: any) {
              toast.error(err.message || 'Gagal upload thumbnail');
            } finally {
              setThumbnailUploading(false);
            }
          }}
        />
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
