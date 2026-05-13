"use client";

import { useState, useEffect } from "react";
import { BarChart3, CheckCircle, XCircle, Clock, Instagram, Facebook, Youtube, Share2, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import Cookies from "js-cookie";
import { fetchSocialStats } from "@/lib/api";

export default function SocialDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get("_at");
    if (token) {
      fetchSocialStats(token)
        .then(setStats)
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
    </div>
  );

  const platformIcon = (p: string, size = 18) => {
    if (p === "INSTAGRAM") return <Instagram size={size} className="text-pink-500" />;
    if (p === "FACEBOOK") return <Facebook size={size} className="text-blue-600" />;
    if (p === "YOUTUBE") return <Youtube size={size} className="text-red-600" />;
    if (p === "TIKTOK") return <span className="text-sm">🎵</span>;
    return <Share2 size={size} className="text-slate-400" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      PUBLISHED: { bg: "bg-emerald-50", text: "text-emerald-700", icon: <CheckCircle size={12} />, label: "Published" },
      FAILED: { bg: "bg-red-50", text: "text-red-700", icon: <XCircle size={12} />, label: "Failed" },
      SCHEDULED: { bg: "bg-blue-50", text: "text-blue-700", icon: <Clock size={12} />, label: "Scheduled" },
    };
    const s = map[status] || map.FAILED;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.icon} {s.label}</span>;
  };

  const platforms = Object.entries(stats?.platformBreakdown || {});
  const maxTotal = Math.max(...platforms.map(([, v]: any) => v.total), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={24} /> Statistik Sosial Media
          </h1>
          <p className="text-slate-500 mt-1">Pantau performa publish ke semua platform.</p>
        </div>
        <Link href="/admin/social-settings" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
          Pengaturan Sosmed <ArrowRight size={14} />
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Share2 size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Publish</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats?.totalPublish || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Berhasil</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats?.totalSuccess || 0}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><TrendingUp size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Success Rate</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats?.successRate || 0}%</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-sky-600"><Calendar size={24} /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">30 Hari Terakhir</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats?.monthlyPublish || 0}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      {platforms.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Platform Breakdown</h2>
          <div className="space-y-5">
            {platforms.map(([platform, data]: any) => {
              const pct = Math.round((data.total / maxTotal) * 100);
              const successPct = data.total > 0 ? Math.round((data.success / data.total) * 100) : 0;
              return (
                <div key={platform} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {platformIcon(platform)}
                      <span className="font-medium text-slate-700">{platform}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="text-emerald-600 font-medium">✓ {data.success}</span>
                      <span className="text-red-500 font-medium">✗ {data.failed}</span>
                      <span className="text-blue-500 font-medium">⏱ {data.scheduled}</span>
                      <span className="font-bold text-slate-700">{data.total} total</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400">Success rate: {successPct}%</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {stats?.recentActivity?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800">Aktivitas Terbaru</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {stats.recentActivity.map((item: any) => (
              <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex-shrink-0">{platformIcon(item.platform)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.contentTitle}</p>
                  <p className="text-xs text-slate-400">{item.contentType} • {new Date(item.createdAt).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex-shrink-0">{statusBadge(item.status)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {(!stats || stats.totalPublish === 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={28} className="text-slate-400" />
          </div>
          <p className="text-slate-500 mb-4">Belum ada data publish sosial media.</p>
          <Link href="/admin/social-settings" className="text-indigo-600 font-semibold hover:text-indigo-700">
            Hubungkan akun sosmed →
          </Link>
        </div>
      )}
    </div>
  );
}
