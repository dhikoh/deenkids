"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RefreshCw, Filter, AlertTriangle, CheckSquare, Square, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";

interface DraftItem {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
  author?: { name: string };
}

const TYPE_OPTIONS = ["", "QNA", "ARTICLE", "PEMBELAJARAN", "KISAH"];
const AGE_OPTIONS = [
  { value: "", label: "Semua Umur" },
  { value: "7", label: "> 7 hari" },
  { value: "14", label: "> 14 hari" },
  { value: "30", label: "> 30 hari" },
  { value: "60", label: "> 60 hari" },
];

const TYPE_COLOR: Record<string, string> = {
  QNA: "bg-blue-100 text-blue-700",
  ARTICLE: "bg-green-100 text-green-700",
  PEMBELAJARAN: "bg-purple-100 text-purple-700",
  KISAH: "bg-amber-100 text-amber-700",
};

function AgeBar({ days }: { days: number }) {
  const pct = Math.min(100, (days / 60) * 100);
  const color = days >= 30 ? "bg-red-400" : days >= 14 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{days} hari</span>
    </div>
  );
}

export default function DraftCleanupPage() {
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterAge, setFilterAge] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1, totalDraft: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("type", filterType);
      if (filterAge) params.set("olderThan", filterAge);
      params.set("page", String(page));
      const res = await fetch(`/api/admin/drafts?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Gagal memuat data");
      const json = await res.json();
      setItems(json.data || []);
      setMeta(json.meta || { total: 0, totalPages: 1, totalDraft: 0 });
    } catch (e: any) {
      toast.error(e.message || "Error memuat DRAFT");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterAge, page]);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/drafts/bulk", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Gagal menghapus");
      const json = await res.json();
      toast.success(`${json.deleted} DRAFT berhasil dihapus`);
      if (json.failed?.length) toast(`${json.failed.length} item tidak bisa dihapus (bukan DRAFT)`);
      setConfirmOpen(false);
      fetchDrafts();
    } catch (e: any) {
      toast.error(e.message || "Error menghapus DRAFT");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="text-red-500" size={24} />
            Manajemen DRAFT Idle
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Bersihkan konten DRAFT yang tidak terpakai untuk menjaga database tetap efisien.
            Hanya <span className="font-semibold">SUPERADMIN</span> yang dapat melakukan penghapusan.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-800">{meta.totalDraft}</div>
            <div className="text-xs text-gray-400 mt-1">Total DRAFT di sistem</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-amber-600">{meta.total}</div>
            <div className="text-xs text-gray-400 mt-1">DRAFT sesuai filter</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-red-600">{selected.size}</div>
            <div className="text-xs text-gray-400 mt-1">Dipilih untuk dihapus</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap items-center gap-3">
          <Filter size={16} className="text-gray-400" />
          <select
            value={filterType}
            onChange={e => { setFilterType(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Semua Tipe</option>
            {TYPE_OPTIONS.filter(Boolean).map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={filterAge}
            onChange={e => { setFilterAge(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {AGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={fetchDrafts}
            className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 p-3">
                    <button onClick={toggleAll}>
                      {selected.size === items.length && items.length > 0
                        ? <CheckSquare size={16} className="text-blue-600" />
                        : <Square size={16} className="text-gray-400" />}
                    </button>
                  </th>
                  <th className="text-left p-3 font-medium text-gray-600">Judul</th>
                  <th className="text-left p-3 font-medium text-gray-600">Tipe</th>
                  <th className="text-left p-3 font-medium text-gray-600">Author</th>
                  <th className="text-left p-3 font-medium text-gray-600">Dibuat</th>
                  <th className="text-left p-3 font-medium text-gray-600">Umur</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      <RefreshCw className="animate-spin mx-auto mb-2" size={20} />
                      Memuat data...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-gray-400">
                      Tidak ada DRAFT yang cocok dengan filter ini
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${selected.has(item.id) ? "bg-red-50" : ""}`}
                    onClick={() => toggle(item.id)}
                  >
                    <td className="p-3">
                      {selected.has(item.id)
                        ? <CheckSquare size={16} className="text-red-500" />
                        : <Square size={16} className="text-gray-300" />}
                    </td>
                    <td className="p-3 max-w-xs">
                      <div className="font-medium text-gray-800 truncate">{item.title}</div>
                      <div className="text-xs text-gray-400 font-mono">{item.id.substring(0, 8)}…</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[item.type] || "bg-gray-100 text-gray-600"}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500">{item.author?.name || "-"}</td>
                    <td className="p-3 text-gray-500 text-xs">
                      {new Date(item.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="p-3">
                      <AgeBar days={item.ageDays} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Hal {page} / {meta.totalPages} ({meta.total} item)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                  disabled={page === meta.totalPages}
                  className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-sm">{selected.size} item dipilih</span>
            <button
              onClick={() => setSelected(new Set())}
              className="text-gray-400 hover:text-white text-sm"
            >
              Batalkan
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-xl text-sm font-medium transition"
            >
              <Trash2 size={14} />
              Hapus {selected.size} DRAFT
            </button>
          </div>
        )}

        {/* Confirm Modal */}
        {confirmOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={22} />
                <div>
                  <h3 className="font-bold text-gray-900">Konfirmasi Penghapusan</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Anda akan menghapus <span className="font-semibold text-red-600">{selected.size} konten DRAFT</span>.
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl py-2.5 text-sm font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  {deleting ? "Menghapus..." : "Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
