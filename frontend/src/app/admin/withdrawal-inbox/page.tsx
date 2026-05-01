"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Banknote, AlertTriangle, X, Filter } from "lucide-react";
import { API_BASE_URL, apiFetch, authHeaders } from "@/lib/api";

const authH = authHeaders;
const statusColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  REJECTED: "bg-rose-100 text-rose-700",
  DISBURSED: "bg-emerald-100 text-emerald-700",
};
const statusLabels: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  DISBURSED: "Sudah Transfer",
};
const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function WithdrawalInboxPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  // Modal state
  const [modal, setModal] = useState<{ open: boolean; type: "approve" | "reject"; id: string; name: string; amount: string }>({
    open: false, type: "reject", id: "", name: "", amount: "",
  });
  const [modalNotes, setModalNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const load = async () => {
    const token = Cookies.get("_at"); if (!token) return;
    try {
      const r = await apiFetch(`${API_BASE_URL}/superadmin/withdrawals`, { headers: authH(token) });
      setData(r.data || []);
    } catch { toast.error("Gagal memuat"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const process = async (id: string, action: string, notes = "") => {
    const token = Cookies.get("_at"); if (!token) return;
    setIsProcessing(true);
    try {
      await apiFetch(`${API_BASE_URL}/superadmin/withdrawals/${id}/process`, {
        method: "PUT", headers: authH(token),
        body: JSON.stringify({ action, notes }),
      });
      toast.success(`Withdrawal berhasil di-${action.toLowerCase()}`);
      setModal({ open: false, type: "reject", id: "", name: "", amount: "" });
      setModalNotes("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const openModal = (type: "approve" | "reject", id: string, name: string, amount: string) => {
    setModal({ open: true, type, id, name, amount });
    setModalNotes("");
  };

  const confirmModal = async () => {
    const action = modal.type === "approve" ? "APPROVED" : "REJECTED";
    await process(modal.id, action, modalNotes);
  };

  const filtered = statusFilter ? data.filter(w => w.status === statusFilter) : data;

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded" />
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Withdrawal Requests</h1>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600">
            <option value="">Semua Status</option>
            <option value="PENDING">Menunggu</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
            <option value="DISBURSED">Sudah Transfer</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {statusFilter ? `Tidak ada withdrawal dengan status "${statusLabels[statusFilter]}".` : "Belum ada permintaan withdrawal."}
          </div>
        ) : filtered.map(w => (
          <div key={w.id} className="p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
              <Banknote size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-bold text-slate-800">{w.user?.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[w.status]}`}>
                  {statusLabels[w.status] || w.status}
                </span>
              </div>
              <p className="text-lg font-extrabold text-emerald-600">
                {formatRp(w.rupiahAmount)} <span className="text-sm font-normal text-slate-500">({w.pointsAmount} poin)</span>
              </p>
              <p className="text-sm text-slate-500">🏦 {w.bankName} • {w.bankAccount} • a.n. {w.bankHolder}</p>
              {w.notes && <p className="text-xs text-slate-400 mt-1 italic">Catatan: {w.notes}</p>}
              <p className="text-xs text-slate-400 mt-1">{new Date(w.createdAt).toLocaleString("id-ID")}</p>
            </div>
            {w.status === "PENDING" && (
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openModal("approve", w.id, w.user?.name, formatRp(w.rupiahAmount))}
                  disabled={isProcessing}
                  className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 disabled:opacity-50 transition-colors"
                  title="Setujui"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => openModal("reject", w.id, w.user?.name, formatRp(w.rupiahAmount))}
                  disabled={isProcessing}
                  className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors"
                  title="Tolak"
                >
                  <XCircle size={16} />
                </button>
              </div>
            )}
            {w.status === "APPROVED" && (
              <button
                onClick={() => process(w.id, "DISBURSED")}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex-shrink-0"
              >
                Sudah Transfer
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Approve / Reject Modal */}
      {modal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${modal.type === "approve" ? "bg-sky-100 text-sky-600" : "bg-rose-100 text-rose-600"}`}>
                  {modal.type === "approve" ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{modal.type === "approve" ? "Setujui Withdrawal" : "Tolak Withdrawal"}</h3>
                  <p className="text-sm text-slate-500">{modal.name} — {modal.amount}</p>
                </div>
              </div>
              <button onClick={() => setModal({ open: false, type: "reject", id: "", name: "", amount: "" })} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600">
              {modal.type === "approve"
                ? "Apakah Anda yakin ingin menyetujui withdrawal ini? Lanjutkan transfer ke rekening author."
                : "Poin akan dikembalikan ke saldo author. Masukkan alasan penolakan (opsional):"}
            </p>
            <textarea
              value={modalNotes}
              onChange={e => setModalNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              rows={3}
              placeholder={modal.type === "approve" ? "Catatan (opsional)..." : "Alasan penolakan..."}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setModal({ open: false, type: "reject", id: "", name: "", amount: "" })}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={confirmModal}
                disabled={isProcessing}
                className={`px-4 py-2 text-white font-bold rounded-xl disabled:opacity-50 transition-colors text-sm ${modal.type === "approve" ? "bg-sky-600 hover:bg-sky-700" : "bg-rose-600 hover:bg-rose-700"}`}
              >
                {isProcessing ? "Memproses..." : modal.type === "approve" ? "Setujui" : "Tolak & Refund Poin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
