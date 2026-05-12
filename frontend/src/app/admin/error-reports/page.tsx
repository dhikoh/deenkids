"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { fetchErrorReports, fetchErrorStats, resolveError, reopenError, resolveAllErrors, deleteError, deleteResolvedErrors } from "@/lib/api";
import { AlertTriangle, CheckCircle2, RotateCcw, Search, ChevronLeft, ChevronRight, Eye, Clock, Hash, Globe, Monitor, User, ChevronDown, ChevronUp, CheckCheck, Trash2, Zap, Server, XCircle } from "lucide-react";
import toast from "react-hot-toast";

interface ErrorItem {
  id: string;
  fingerprint: string;
  message: string;
  stack?: string;
  source?: string;
  userAgent?: string;
  userId?: string;
  category: string;
  httpStatus?: number;
  occurrences: number;
  isResolved: boolean;
  lastSeenAt: string;
  createdAt: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  API_ERROR: { label: "API Error", color: "text-rose-700", bg: "bg-rose-50 border-rose-200", icon: "🔌" },
  JS_ERROR: { label: "JS Error", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "⚡" },
  REACT_CRASH: { label: "React Crash", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "💥" },
  PROMISE_REJECT: { label: "Promise Reject", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: "🔗" },
};

function getSeverity(err: ErrorItem): { label: string; color: string; bg: string } {
  if (err.category === 'REACT_CRASH') return { label: "CRITICAL", color: "text-red-700", bg: "bg-red-100" };
  if (err.category === 'API_ERROR' && err.httpStatus && err.httpStatus >= 500) return { label: "CRITICAL", color: "text-red-700", bg: "bg-red-100" };
  if (err.category === 'API_ERROR') return { label: "WARNING", color: "text-amber-700", bg: "bg-amber-100" };
  return { label: "INFO", color: "text-sky-700", bg: "bg-sky-100" };
}

export default function ErrorReportsPage() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [stats, setStats] = useState({ total: 0, unresolved: 0, last24h: 0, apiErrors: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("false");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("lastSeenAt");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmResolveAll, setConfirmResolveAll] = useState(false);
  const [confirmDeleteResolved, setConfirmDeleteResolved] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const token = Cookies.get("_at") || "";

  const load = async () => {
    setLoading(true);
    try {
      const [res, st] = await Promise.all([
        fetchErrorReports(token, page, filter || undefined, search || undefined, categoryFilter || undefined, sortBy),
        fetchErrorStats(token),
      ]);
      setErrors(res.data || []);
      setTotalPages(res.meta?.totalPages || 1);
      setStats(st);
    } catch (e: any) {
      toast.error(e.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filter, categoryFilter, sortBy]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleResolve = async (id: string) => {
    try { await resolveError(id, token); toast.success("Error ditandai resolved"); load(); }
    catch { toast.error("Gagal mengubah status"); }
  };

  const handleReopen = async (id: string) => {
    try { await reopenError(id, token); toast.success("Error dibuka kembali"); load(); }
    catch { toast.error("Gagal mengubah status"); }
  };

  const handleResolveAll = async () => {
    try { await resolveAllErrors(token); toast.success("Semua error resolved"); setConfirmResolveAll(false); load(); }
    catch { toast.error("Gagal"); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteError(id, token); toast.success("Error dihapus"); setConfirmDeleteId(null); load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const handleDeleteResolved = async () => {
    try { const res = await deleteResolvedErrors(token); toast.success(res.message || "Resolved errors dihapus"); setConfirmDeleteResolved(false); load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m lalu`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}j lalu`;
    const days = Math.floor(hours / 24);
    return `${days}h lalu`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-amber-500" size={24} /> Error Reports
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitor dan kelola error frontend & API</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.unresolved > 0 && (
            confirmResolveAll ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-amber-600 font-medium">Resolve semua?</span>
                <button onClick={handleResolveAll} className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">Ya, Resolve</button>
                <button onClick={() => setConfirmResolveAll(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Batal</button>
              </div>
            ) : (
              <button onClick={() => setConfirmResolveAll(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors">
                <CheckCheck size={16} /> Resolve Semua ({stats.unresolved})
              </button>
            )
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl"><AlertTriangle size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-2xl font-extrabold text-amber-700">{stats.unresolved}</p>
              <p className="text-xs text-amber-600 font-medium">Belum Resolved</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-xl"><Clock size={20} className="text-sky-600" /></div>
            <div>
              <p className="text-2xl font-extrabold text-sky-700">{stats.last24h}</p>
              <p className="text-xs text-sky-600 font-medium">24 Jam Terakhir</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-red-50 border border-rose-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 rounded-xl"><Server size={20} className="text-rose-600" /></div>
            <div>
              <p className="text-2xl font-extrabold text-rose-700">{stats.apiErrors}</p>
              <p className="text-xs text-rose-600 font-medium">API Errors</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-xl"><CheckCircle2 size={20} className="text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-extrabold text-emerald-700">{stats.total}</p>
              <p className="text-xs text-emerald-600 font-medium">Total Error Unik</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
          {[
            { label: "Aktif", value: "false" },
            { label: "Resolved", value: "true" },
            { label: "Semua", value: "" },
          ].map(f => (
            <button key={f.value} onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f.value ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 bg-white"
        >
          <option value="">Semua Kategori</option>
          <option value="API_ERROR">🔌 API Error</option>
          <option value="JS_ERROR">⚡ JS Error</option>
          <option value="REACT_CRASH">💥 React Crash</option>
          <option value="PROMISE_REJECT">🔗 Promise Reject</option>
        </select>
        <select
          value={sortBy}
          onChange={e => { setSortBy(e.target.value); setPage(1); }}
          className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 bg-white"
        >
          <option value="lastSeenAt">Terbaru</option>
          <option value="occurrences">Paling Sering</option>
        </select>
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Cari error message..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
        </form>
      </div>

      {/* Error List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : errors.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-300" />
          <p className="font-bold text-lg text-slate-500">Tidak ada error</p>
          <p className="text-sm">Semua berjalan lancar! 🎉</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map(err => {
            const catConfig = CATEGORY_CONFIG[err.category] || CATEGORY_CONFIG.JS_ERROR;
            const severity = getSeverity(err);
            return (
              <div key={err.id} className={`border rounded-2xl transition-all ${err.isResolved ? "bg-slate-50 border-slate-200" : "bg-white border-amber-200 shadow-sm"}`}>
                <div className="p-4 flex items-start gap-3 cursor-pointer" onClick={() => setExpandedId(expandedId === err.id ? null : err.id)}>
                  <div className={`mt-0.5 p-1.5 rounded-lg ${err.isResolved ? "bg-emerald-100" : "bg-amber-100"}`}>
                    {err.isResolved ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${severity.bg} ${severity.color}`}>{severity.label}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${catConfig.bg} ${catConfig.color}`}>{catConfig.icon} {catConfig.label}</span>
                      {err.httpStatus && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{err.httpStatus}</span>}
                    </div>
                    <p className={`font-bold text-sm truncate ${err.isResolved ? "text-slate-500" : "text-slate-800"}`}>{err.message}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Hash size={12} />{err.occurrences}×</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{timeAgo(err.lastSeenAt)}</span>
                      {err.source && <span className="flex items-center gap-1 truncate max-w-[200px]"><Globe size={12} />{err.source.replace(/https?:\/\/[^/]+/, '')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {err.isResolved ? (
                      <button onClick={e => { e.stopPropagation(); handleReopen(err.id); }} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Buka kembali">
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); handleResolve(err.id); }} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Tandai resolved">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    {confirmDeleteId === err.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDelete(err.id)} className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded">Hapus</button>
                        <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded">Batal</button>
                      </div>
                    ) : (
                      <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(err.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
                        <Trash2 size={16} />
                      </button>
                    )}
                    {expandedId === err.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Detail */}
                {expandedId === err.id && (
                  <div className="border-t border-slate-100 p-4 space-y-3 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <Globe size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div><span className="font-bold text-slate-500">URL:</span> <span className="text-slate-600 break-all">{err.source || "-"}</span></div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Monitor size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div><span className="font-bold text-slate-500">Browser:</span> <span className="text-slate-600 break-all">{err.userAgent?.substring(0, 100) || "-"}</span></div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div><span className="font-bold text-slate-500">User ID:</span> <span className="text-slate-600">{err.userId || "Anonymous"}</span></div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Eye size={14} className="text-slate-400 mt-0.5 shrink-0" />
                        <div><span className="font-bold text-slate-500">Pertama:</span> <span className="text-slate-600">{new Date(err.createdAt).toLocaleString("id-ID")}</span></div>
                      </div>
                    </div>
                    {err.stack && (
                      <div>
                        <p className="font-bold text-slate-500 mb-1">Stack Trace:</p>
                        <pre className="bg-slate-900 text-emerald-400 p-3 rounded-xl overflow-x-auto text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">{err.stack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer: Pagination + Bulk Delete */}
      <div className="flex flex-wrap justify-between items-center gap-4 pt-2">
        {/* Bulk Delete Resolved */}
        <div>
          {filter === 'true' && errors.length > 0 && (
            confirmDeleteResolved ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-medium">Hapus semua resolved?</span>
                <button onClick={handleDeleteResolved} className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700">Ya, Hapus</button>
                <button onClick={() => setConfirmDeleteResolved(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Batal</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDeleteResolved(true)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 border border-rose-200 transition-colors">
                <Trash2 size={14} /> Hapus Semua Resolved
              </button>
            )
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-bold text-slate-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
