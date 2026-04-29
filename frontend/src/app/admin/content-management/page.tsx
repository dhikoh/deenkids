"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Link from "next/link";
import { FileText, Trash2, Edit2, Film, Eye, Search } from "lucide-react";
import { copyVideoScript } from "@/lib/videoScript";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const apiFetch = async (url: string, opts: RequestInit = {}) => { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Error"); } return r.json(); };

const statusColors: Record<string, string> = { DRAFT: "bg-slate-100 text-slate-600", REVIEW: "bg-amber-100 text-amber-700", REVISION: "bg-rose-100 text-rose-700", PUBLISHED: "bg-emerald-100 text-emerald-700", ARCHIVED: "bg-slate-200 text-slate-500" };
const statusLabels: Record<string, string> = { DRAFT: "Draft", REVIEW: "Review", REVISION: "Revisi", PUBLISHED: "Terbit", ARCHIVED: "Arsip" };

export default function ContentManagementPage() {
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>({});

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const params = new URLSearchParams();
      if (filter) params.append("status", filter);
      params.append("page", page.toString());
      const res = await apiFetch(`${API}/admin/contents?${params}`, { headers: authH(token) });
      setContents(res.data || []); setMeta(res.meta || {});
    } catch { toast.error("Gagal memuat konten"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, page]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Hapus konten "${title}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const token = Cookies.get("access_token");
    try {
      await apiFetch(`${API}/editor/content/${id}`, { method: "DELETE", headers: authH(token || "") });
      toast.success("Konten dihapus"); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleExportScript = async (id: string) => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const res = await apiFetch(`${API}/editor/content/${id}`, { headers: authH(token) });
      const ok = copyVideoScript(res.data);
      if (ok) toast.success("Script video berhasil disalin ke clipboard!"); else toast.error("Gagal menyalin");
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{item.type}</span>
                    <span className="text-[10px] font-bold text-slate-400">{item.ageGroup} thn</span>
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
                  <button onClick={() => handleExportScript(item.id)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100" title="Export Script Video">
                    <Film size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id, item.title)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Hapus">
                    <Trash2 size={16} />
                  </button>
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
    </div>
  );
}
