"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, Search, AlertTriangle, Clock, XCircle } from "lucide-react";
import { fetchTrash, restoreFromTrash, permanentlyDeleteContent, emptyTrash } from "@/lib/api";

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  REVIEW: "bg-amber-100 text-amber-700",
  REVISION: "bg-rose-100 text-rose-700",
  PUBLISHED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-200 text-slate-500",
};

function daysUntilPurge(deletedAt: string): number {
  const deleted = new Date(deletedAt);
  const purgeDate = new Date(deleted);
  purgeDate.setDate(purgeDate.getDate() + 30);
  const now = new Date();
  return Math.max(0, Math.ceil((purgeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function TrashPage() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem("user") || "{}"); setUserRole(u.role || ""); } catch {}
  }, []);

  const load = async () => {
    const token = Cookies.get("_at");
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetchTrash(token, page, search || undefined);
      setItems(res.data || []);
      setMeta(res.meta || null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search]);

  const handleRestore = async (id: string) => {
    const token = Cookies.get("_at");
    try {
      await restoreFromTrash(id, token || "");
      toast.success("Konten dipulihkan ke Draft");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handlePermanentDelete = async (id: string) => {
    const token = Cookies.get("_at");
    try {
      await permanentlyDeleteContent(id, token || "");
      toast.success("Konten dihapus permanen");
      setConfirmDeleteId(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleEmptyTrash = async () => {
    const token = Cookies.get("_at");
    try {
      const res = await emptyTrash(token || "");
      toast.success(res.message || "Tempat sampah dikosongkan");
      setConfirmEmpty(false);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Trash2 className="text-rose-500" /> Tempat Sampah
          </h1>
          <p className="text-sm text-slate-500 mt-1">Konten yang dihapus akan otomatis terhapus permanen setelah 30 hari</p>
        </div>
        {userRole === "SUPERADMIN" && items.length > 0 && (
          confirmEmpty ? (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-rose-600 font-medium">Hapus semua?</span>
              <button onClick={handleEmptyTrash} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700">Ya, Kosongkan</button>
              <button onClick={() => setConfirmEmpty(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Batal</button>
            </div>
          ) : (
            <button onClick={() => setConfirmEmpty(true)} className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors text-sm flex items-center gap-2">
              <XCircle size={16} /> Kosongkan Sampah
            </button>
          )
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text" placeholder="Cari konten..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Trash2 size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Tempat Sampah Kosong</p>
          <p className="text-sm">Tidak ada konten yang dihapus</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => {
            const days = daysUntilPurge(item.deletedAt);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[item.previousStatus || "DRAFT"]}`}>
                        {item.previousStatus || "DRAFT"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-500">
                        Di Sampah
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>{item.type}</span>
                      {item.author?.name && <span>oleh {item.author.name}</span>}
                      {item.node?.title && <span>• {item.node.title}</span>}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs">
                      <Clock size={12} className={days <= 5 ? "text-rose-500" : "text-amber-500"} />
                      <span className={days <= 5 ? "text-rose-500 font-medium" : "text-amber-600"}>
                        {days === 0 ? "Akan dihapus hari ini" : `Dihapus permanen dalam ${days} hari`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleRestore(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="Pulihkan ke Draft">
                      <RotateCcw size={16} />
                    </button>
                    {userRole === "SUPERADMIN" && (
                      confirmDeleteId === item.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handlePermanentDelete(item.id)} className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded">Ya, Hapus</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded">Batal</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors" title="Hapus Permanen">
                          <AlertTriangle size={16} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? "bg-rose-600 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"}`}
            >{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
