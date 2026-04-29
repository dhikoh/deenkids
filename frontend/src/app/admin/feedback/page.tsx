"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchFeedbackList, markFeedbackRead } from "@/lib/api";
import { MessageSquare, Eye, Mail, Search } from "lucide-react";

const typeColors: Record<string, string> = {
  kritik: "bg-rose-100 text-rose-700",
  saran: "bg-emerald-100 text-emerald-700",
  pertanyaan: "bg-sky-100 text-sky-700",
};

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      const res = await fetchFeedbackList(token, 1, search || undefined);
      setFeedbacks(res.data || []);
    } catch { toast.error("Gagal memuat feedback"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { setIsLoading(true); load(); }, [search]);

  const handleRead = async (id: string) => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      await markFeedbackRead(id, token);
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, isRead: true } : f));
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Kritik & Saran</h1><p className="text-slate-500">Masukan dari pengunjung Adably.</p></div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari feedback..." className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-sm text-slate-700 font-medium" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> :
         feedbacks.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada feedback.</div> :
         feedbacks.map(f => (
          <div key={f.id} className={`p-4 flex items-start gap-4 ${f.isRead ? "" : "bg-emerald-50/50"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[f.type] || "bg-slate-100 text-slate-600"}`}>
              <MessageSquare size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800">{f.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded capitalize ${typeColors[f.type]}`}>{f.type}</span>
                {!f.isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
              </div>
              <p className="text-sm text-slate-700">{f.message}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                <span>{new Date(f.createdAt).toLocaleString("id-ID")}</span>
                {f.email && <span className="flex items-center gap-1"><Mail size={12} /> {f.email}</span>}
              </div>
            </div>
            {!f.isRead && (
              <button onClick={() => handleRead(f.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg flex-shrink-0" title="Tandai dibaca"><Eye size={16} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
