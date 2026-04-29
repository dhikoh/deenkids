"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchMyContents, deleteContent, submitContentForReview } from "@/lib/api";
import { Eye, Edit2, Trash2, Send, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

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

  const load = async () => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      const res = await fetchMyContents(token, filter || undefined);
      setContents(res.data || []);
    } catch { toast.error("Gagal memuat konten"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus konten ini?")) return;
    const token = Cookies.get("access_token");
    try {
      await deleteContent(id, token || "");
      toast.success("Konten dihapus");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSubmit = async (id: string) => {
    const token = Cookies.get("access_token");
    try {
      await submitContentForReview(id, token || "");
      toast.success("Konten diajukan untuk review");
      load();
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

      <div className="flex gap-2">
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
          {contents.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColors[item.status]}`}>{statusLabels[item.status]}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{item.type}</span>
                </div>
                <h3 className="font-bold text-slate-800">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{item.node?.title} • {item.ageGroup} thn • {new Date(item.updatedAt).toLocaleDateString("id-ID")}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.status === "DRAFT" || item.status === "REVISION" ? (
                  <button onClick={() => handleSubmit(item.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Ajukan Review"><Send size={16} /></button>
                ) : null}
                <button onClick={() => handleDelete(item.id)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Hapus"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
