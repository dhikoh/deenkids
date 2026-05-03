"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Link from "next/link";
import { FileText, Trash2, Edit2, Film, BookOpen, Search, RotateCcw, X, Send } from "lucide-react";
import { copyVideoScript } from "@/lib/videoScript";
import { fetchAllContents, deleteContent, fetchContentForEdit, unpublishContent, submitContentForReview } from "@/lib/api";

const AGE_OPTIONS = ["", "3-5", "5-7", "7-10", "10-13"];
const statusColors: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-600", REVIEW: "bg-amber-100 text-amber-700", REVISION: "bg-rose-100 text-rose-700", PUBLISHED: "bg-emerald-100 text-emerald-700", ARCHIVED: "bg-slate-200 text-slate-500" };
const statusLabels: Record<string, string> = { DRAFT: "Draft", REVIEW: "Review", REVISION: "Revisi", PUBLISHED: "Terbit", ARCHIVED: "Arsip" };

export default function ContentManagementPage() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<any | null>(null);
  const [unpublishNotes, setUnpublishNotes] = useState("");

  const load = async () => {
    const token = Cookies.get("_at"); if (!token) return;
    try {
      const res = await fetchAllContents(token, filter || undefined, page, search || undefined, ageFilter || undefined);
      setContents(res.data || []); setMeta(res.meta || {});
    } catch { toast.error("Gagal memuat konten"); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); load(); }, [filter, page, search, ageFilter]);

  const handleDelete = async (id: string) => {
    const token = Cookies.get("_at");
    try {
      await deleteContent(id, token || "");
      toast.success("Konten dipindahkan ke Tempat Sampah"); setConfirmDeleteId(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleExportScript = async (id: string) => {
    const token = Cookies.get("_at"); if (!token) return;
    try {
      const res = await fetchContentForEdit(token, id);
      const ok = copyVideoScript(res.data);
      if (ok) toast.success("Script video berhasil disalin ke clipboard!"); else toast.error("Gagal menyalin");
    } catch (e: any) { toast.error(e.message); }
  };

  const handleUnpublish = async () => {
    if (!unpublishTarget) return;
    const token = Cookies.get("_at");
    try {
      await unpublishContent(unpublishTarget.id, unpublishNotes, token || "");
      toast.success("Konten berhasil di-unpublish");
      setUnpublishTarget(null); setUnpublishNotes(""); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSubmitReview = async (id: string) => {
    const token = Cookies.get("_at");
    try {
      await submitContentForReview(id, token || "");
      toast.success("Konten diajukan untuk review"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kelola Konten</h1>
          <p className="text-slate-500">Kelola semua konten dari seluruh penulis.</p>
        </div>
      </div>

      {/* Search + Age */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cari judul konten..." className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-sm text-slate-700 font-medium" />
        </div>
        <select value={ageFilter} onChange={e => { setAgeFilter(e.target.value); setPage(1); }} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white">
          <option value="">Semua Usia</option>
          {AGE_OPTIONS.filter(a => a).map(a => <option key={a} value={a}>{a} Tahun</option>)}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "DRAFT", "REVIEW", "REVISION", "PUBLISHED", "ARCHIVED"].map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1); }} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filter === s ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {s ? statusLabels[s] : "Semua"}
          </button>
        ))}
      </div>

      {loading ? <div className="p-8 text-center text-slate-500">Memuat...</div> : contents.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText className="mx-auto mb-4 text-slate-300" size={48} />
          <h3 className="text-lg font-bold text-slate-800">Tidak ada konten</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[item.status]}`}>{statusLabels[item.status]}</span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      item.type === 'QNA' ? 'bg-amber-50 text-amber-600' :
                      item.type === 'PEMBELAJARAN' ? 'bg-emerald-50 text-emerald-600' :
                      item.type === 'KISAH' ? 'bg-orange-50 text-orange-600' :
                      'bg-sky-50 text-sky-600'
                    }`}>
                      {item.type === 'QNA' ? 'Tanya Jawab' : item.type === 'PEMBELAJARAN' ? 'Pembelajaran' : item.type === 'KISAH' ? 'Kisah' : 'Artikel'}
                    </span>
                    {(item.ageGroups || []).map((a: string) => <span key={a} className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-600 rounded">{a} thn</span>)}
                  </div>
                  <h3 className="font-bold text-slate-800">{item.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Oleh: <span className="font-medium text-slate-700">{item.author?.name || 'Unknown'}</span>
                    {item.node?.title && <> • {item.node.title}</>}
                    {' '}• {new Date(item.updatedAt).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Link href={`/admin/editor?id=${item.id}`} className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100" title="Edit">
                    <Edit2 size={16} />
                  </Link>
                  <button onClick={() => handleExportScript(item.id)} className={`p-2 rounded-lg ${item.type === 'KISAH' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`} title={item.type === 'KISAH' ? 'Export Naskah Kisah' : 'Export Script Video'}>
                    {item.type === 'KISAH' ? <BookOpen size={16} /> : <Film size={16} />}
                  </button>
                  {item.status === "PUBLISHED" && (
                    <button onClick={() => setUnpublishTarget(item)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Unpublish — Tarik untuk revisi">
                      <RotateCcw size={16} />
                    </button>
                  )}
                  {/* Admin/SuperAdmin can submit DRAFT/REVISION content for review */}
                  {['DRAFT', 'REVISION'].includes(item.status) && (
                    <button onClick={() => handleSubmitReview(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Ajukan untuk Review">
                      <Send size={16} />
                    </button>
                  )}
                  {confirmDeleteId === item.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded">Ya, Hapus</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded">Batal</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Hapus">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-sm font-bold ${page === p ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Unpublish Modal */}
      {unpublishTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setUnpublishTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <RotateCcw size={22} />
                <h3 className="font-extrabold">Unpublish Konten</h3>
              </div>
              <button onClick={() => setUnpublishTarget(null)} className="text-white/70 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">Konten <span className="font-bold">"{unpublishTarget.title}"</span> akan ditarik dari publikasi dan dikembalikan ke status <span className="font-bold text-amber-600">REVISION</span>.</p>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan untuk penulis (opsional)</label>
                <textarea value={unpublishNotes} onChange={e => setUnpublishNotes(e.target.value)} placeholder="Alasan unpublish atau instruksi revisi..." className="w-full border-slate-300 rounded-lg p-3 text-sm min-h-[80px] focus:ring-amber-500 focus:border-amber-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-slate-100">
              <button onClick={() => setUnpublishTarget(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl">Batal</button>
              <button onClick={handleUnpublish} className="px-4 py-2 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl">Unpublish & Revisi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
