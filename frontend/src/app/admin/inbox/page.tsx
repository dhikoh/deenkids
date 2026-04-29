"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from "@/lib/api";
import { Bell, CheckCheck, Eye, ExternalLink, Search } from "lucide-react";
import Link from "next/link";

const typeColors: Record<string, string> = {
  REVIEW_REQUEST: "bg-amber-100 text-amber-700",
  CONTENT_APPROVED: "bg-emerald-100 text-emerald-700",
  CONTENT_REJECTED: "bg-rose-100 text-rose-700",
  REVISION_NEEDED: "bg-sky-100 text-sky-700",
  DONATION_RECEIVED: "bg-purple-100 text-purple-700",
  FEEDBACK_RECEIVED: "bg-teal-100 text-teal-700",
  SYSTEM_ALERT: "bg-slate-100 text-slate-700",
};

const typeLabels: Record<string, string> = {
  REVIEW_REQUEST: "Review",
  CONTENT_APPROVED: "Approved",
  CONTENT_REJECTED: "Rejected",
  REVISION_NEEDED: "Revisi",
  DONATION_RECEIVED: "Donasi",
  FEEDBACK_RECEIVED: "Feedback",
  SYSTEM_ALERT: "Sistem",
};

export default function InboxPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<any>({});
  const [search, setSearch] = useState("");

  const load = async (page = 1) => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      const res = await fetchNotifications(token, page, search || undefined);
      setNotifications(res.data || []);
      setMeta(res.meta || {});
    } catch { toast.error("Gagal memuat notifikasi"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { setIsLoading(true); load(); }, [search]);

  const handleRead = async (id: string) => {
    const token = Cookies.get("access_token");
    if (!token) return;
    await markNotificationRead(id, token);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const handleReadAll = async () => {
    const token = Cookies.get("access_token");
    if (!token) return;
    await markAllNotificationsRead(token);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success("Semua notifikasi ditandai dibaca");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Inbox</h1><p className="text-slate-500">Pusat notifikasi dan pemberitahuan.</p></div>
        <button onClick={handleReadAll} className="text-sm bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-200"><CheckCheck size={16} /> Tandai Semua Dibaca</button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari notifikasi..." className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-sm text-slate-700 font-medium" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> :
         notifications.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada notifikasi.</div> :
         notifications.map(n => (
          <div key={n.id} className={`p-4 flex items-start gap-4 transition-colors ${n.isRead ? "bg-white" : "bg-emerald-50/50"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${typeColors[n.type] || "bg-slate-100"}`}>
              <Bell size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${typeColors[n.type]}`}>{typeLabels[n.type] || n.type}</span>
                {!n.isRead && <span className="w-2 h-2 bg-emerald-500 rounded-full" />}
              </div>
              <p className="font-bold text-slate-800 text-sm">{n.title}</p>
              <p className="text-sm text-slate-500 mt-0.5">{n.message}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString("id-ID")}{n.actor?.name && ` • oleh ${n.actor.name}`}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!n.isRead && <button onClick={() => handleRead(n.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Tandai dibaca"><Eye size={16} /></button>}
              {n.linkUrl && <Link href={n.linkUrl} className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg" title="Lihat"><ExternalLink size={16} /></Link>}
            </div>
          </div>
        ))}
      </div>
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => (
            <button key={i} onClick={() => load(i + 1)} className={`px-3 py-1 rounded-lg text-sm font-bold ${meta.page === i + 1 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{i + 1}</button>
          ))}
        </div>
      )}
    </div>
  );
}
