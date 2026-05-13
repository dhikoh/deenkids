"use client";

import { useState, useEffect } from "react";
import { Users, FileText, Eye, Heart, AlertCircle, PenLine, Instagram, Facebook, Youtube, Clock, Calendar, Share2 } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { fetchDashboardStats, fetchScheduledPosts } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("_at");
    if (token) {
      Promise.all([
        fetchDashboardStats(token).catch(() => null),
        fetchScheduledPosts(token).catch(() => ({ data: [] })),
      ])
        .then(([s, sp]) => {
          setStats(s);
          setScheduled(sp?.data || []);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat dashboard...</div>;

  const isAUTHOR = stats?.role === "AUTHOR";
  const isSuperAdmin = stats?.role === "SUPERADMIN";
  const roleLabel = stats?.role === "SUPERADMIN" ? "SuperAdmin" : stats?.role === "ADMIN" ? "Admin" : "Penulis";

  const platformIcon = (p: string) => {
    if (p === "INSTAGRAM") return <Instagram size={16} className="text-pink-500" />;
    if (p === "FACEBOOK") return <Facebook size={16} className="text-blue-600" />;
    if (p === "YOUTUBE") return <Youtube size={16} className="text-red-600" />;
    return <Share2 size={16} className="text-slate-400" />;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard {roleLabel}</h1>
          <p className="text-slate-500">{isAUTHOR ? "Pantau statistik konten Anda." : "Ringkasan performa dan metrik Adably Platform."}</p>
        </div>
        <Link href="/admin/editor" className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2">
          <PenLine size={18} /> Tulis Konten Baru
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><Eye size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Views</p>
              <h3 className="text-2xl font-bold text-slate-800">{(stats?.totalViews || 0).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><Heart size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Likes</p>
              <h3 className="text-2xl font-bold text-slate-800">{(stats?.totalLikes || 0).toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><FileText size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">{isAUTHOR ? "Total Konten Saya" : "Konten Aktif"}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isAUTHOR ? (stats?.totalContents || 0) : (stats?.publishedContent || 0)}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">{isAUTHOR ? <AlertCircle size={24} /> : <Users size={24} />}</div>
            <div>
              <p className="text-sm font-medium text-slate-500">{isAUTHOR ? "Menunggu Review" : "Penulis Aktif"}</p>
              <h3 className="text-2xl font-bold text-slate-800">{isAUTHOR ? (stats?.inReview || 0) : (stats?.totalEditors || 0)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Social Posts */}
      {scheduled.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Calendar className="text-indigo-500" size={20} /> Jadwal Publish Sosmed</h3>
            {isSuperAdmin && (
              <Link href="/admin/social-settings" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">Kelola Sosmed →</Link>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {scheduled.map((item: any) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0">{platformIcon(item.platform)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.contentTitle}</p>
                  <p className="text-xs text-slate-400">{item.contentType} • {item.platform}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full font-medium flex-shrink-0">
                  <Clock size={12} />
                  {new Date(item.scheduledAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Queue (Admin/SuperAdmin) */}
      {!isAUTHOR && stats?.recentReviewQueue?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertCircle className="text-amber-500" /> Menunggu Persetujuan</h3>
            <Link href="/admin/review" className="text-sm text-emerald-600 font-semibold hover:text-emerald-700">Lihat Semua</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentReviewQueue.map((item: any) => (
              <div key={item.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                  <p className="text-sm text-slate-500">Oleh: {item.author} • {new Date(item.updatedAt).toLocaleDateString("id-ID")}</p>
                </div>
                <div className="flex items-center gap-4">
                  {item.aiScore && (
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-bold uppercase">AI Score</p>
                      <p className="font-bold text-emerald-600">{item.aiScore}/100</p>
                    </div>
                  )}
                  <Link href="/admin/review" className="px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-sm transition-colors">Review</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
