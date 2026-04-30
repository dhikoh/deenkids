"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchMyContents, deleteContent, submitContentForReview } from "@/lib/api";
import { Eye, Edit2, Trash2, Send, FileText, Search, MessageCircle, X } from "lucide-react";
import Link from "next/link";

const AGE_OPTIONS = ["", "3-5", "5-7", "7-10", "10-13"];
const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  REVIEW: "bg-amber-100 text-amber-700",
  REVISION: "bg-rose-100 text-rose-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};
const statusLabels: Record<string, string> = {
  DRAFT: "Draft", REVIEW: "Menunggu Review", REVISION: "Perlu Revisi", PUBLISHED: "Dipublikasikan", ARCHIVED: "Diarsipkan",
};

export default function MyContentsPage() {
  const [contents, setContents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = async () => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      const res = await fetchMyContents(token, filter || undefined, undefined, search || undefined, ageFilter || undefined);
      setContents(res.data || []);
    } catch { toast.error("Gagal memuat konten"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { setIsLoading(true); load(); }, [filter, search, ageFilter]);

  const handleDelete = async (id: string) => {
    const token = Cookies.get("access_token");
    try {
      await deleteContent(id, token || "");
      toast.success("Konten dihapus"); setConfirmDeleteId(null); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSubmit = async (id: string) => {
    const token = Cookies.get("access_token");
    try {
      await submitContentForReview(id, token || "");
      toast.success("Konten diajukan untuk review"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Konten Saya</h1>
          <p className="text-slate-500">Kelola semua konten yang Anda buat.</p>
        </div>
        <Link href="/admin/editor" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2"><FileText size={18} /> Buat Baru</Link>
      </div>

      {/* Search + Age Filter */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul konten..." className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-sm text-slate-700 font-medium" />
        </div>
        <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 bg-white">
          <option value="">Semua Usia</option>
          {AGE_OPTIONS.filter(a => a).map(a => <option key={a} value={a}>{a} Tahun</option>)}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "DRAFT", "REVIEW", "REVISION", "PUBLISHED"].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${filter === s ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {s ? statusLabels[s] : "Semua"}
          </button>
        ))}
      </div>

      {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> : contents.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileText className="mx-auto mb-4 text-slate-300" size={48} />
          <h3 className="text-lg font-bold text-slate-800">Belum ada konten</h3>
          <p className="text-slate-500 mt-1">Mulai buat konten pertama Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contents.map((item) => {
            const lastReview = item.reviewHistory?.[0];
            const showNotes = (item.status === "REVISION" || item.status === "DRAFT") && lastReview?.notes;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="p-5 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[item.status]}`}>{statusLabels[item.status]}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${item.type === "QNA" ? "bg-amber-50 text-amber-600" : item.type === "PEMBELAJARAN" ? "bg-purple-50 text-purple-600" : "bg-sky-50 text-sky-600"}`}>{item.type === "QNA" ? "Tanya Jawab" : item.type === "PEMBELAJARAN" ? "Pembelajaran" : "Artikel"}</span>
                      {item.ageGroups?.map((a: string) => <span key={a} className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-600 rounded">{a} thn</span>)}
                    </div>
                    <h3 className="font-bold text-slate-800">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{item.node?.title} • {new Date(item.updatedAt).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {showNotes && (
                      <button onClick={() => setExpandedNotes(expandedNotes === item.id ? null : item.id)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Lihat catatan reviewer">
                        <MessageCircle size={16} />
                      </button>
                    )}
                    {(item.status === "DRAFT" || item.status === "REVISION") && (
                      <>
                        <Link href={`/admin/editor?id=${item.id}`} className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100" title="Edit"><Edit2 size={16} /></Link>
                        <button onClick={() => handleSubmit(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Ajukan Review"><Send size={16} /></button>
                      </>
                    )}
                    {item.status !== "PUBLISHED" && (
                      confirmDeleteId === item.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded">Ya, Hapus</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded">Batal</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Hapus"><Trash2 size={16} /></button>
                      )
                    )}
                  </div>
                </div>
                {/* Reviewer Notes Expandable */}
                {showNotes && expandedNotes === item.id && (
                  <div className="border-t border-slate-100 p-4 bg-amber-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-amber-700 mb-1">📝 Catatan dari Reviewer{lastReview.reviewer?.name ? ` (${lastReview.reviewer.name})` : ""}</p>
                        <p className="text-sm text-slate-700">{lastReview.notes}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{new Date(lastReview.createdAt).toLocaleString("id-ID")}</p>
                      </div>
                      <button onClick={() => setExpandedNotes(null)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
