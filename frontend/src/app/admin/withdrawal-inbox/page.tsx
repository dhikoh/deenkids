"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Banknote, AlertTriangle, X } from "lucide-react";
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

  // Reject Modal state
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: string; name: string }>({
    open: false, id: "", name: "",
  });
  const [rejectNotes, setRejectNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const r = await apiFetch(`${API_BASE_URL}/superadmin/withdrawals`, { headers: authH(token) });
      setData(r.data || []);
    } catch { toast.error("Gagal memuat"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const process = async (id: string, action: string, notes = "") => {
    const token = Cookies.get("access_token"); if (!token) return;
    setIsProcessing(true);
    try {
      await apiFetch(`${API_BASE_URL}/superadmin/withdrawals/${id}/process`, {
        method: "PUT", headers: authH(token),
        body: JSON.stringify({ action, notes }),
      });
      toast.success(`Withdrawal berhasil di-${action.toLowerCase()}`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setIsProcessing(false); }
  };

  const openRejectModal = (id: string, name: string) => {
    setRejectModal({ open: true, id, name });
    setRejectNotes("");
  };

  const confirmReject = async () => {
    await process(rejectModal.id, "REJECTED", rejectNotes);
    setRejectModal({ open: false, id: "", name: "" });
  };

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded" />
      {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Withdrawal Requests</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {data.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada permintaan withdrawal.</div>
        ) : data.map(w => (
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
                  onClick={() => process(w.id, "APPROVED")}
                  disabled={isProcessing}
                  className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 disabled:opacity-50 transition-colors"
                  title="Setujui"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => openRejectModal(w.id, w.user?.name)}
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

      {/* Reject Modal */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Tolak Withdrawal</h3>
                  <p className="text-sm text-slate-500">{rejectModal.name}</p>
                </div>
              </div>
              <button onClick={() => setRejectModal({ open: false, id: "", name: "" })} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-slate-600">Poin akan dikembalikan ke saldo author. Masukkan alasan penolakan (opsional):</p>
            <textarea
              value={rejectNotes}
              onChange={e => setRejectNotes(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
              rows={3}
              placeholder="Alasan penolakan..."
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, id: "", name: "" })}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={confirmReject}
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl disabled:opacity-50 transition-colors text-sm"
              >
                {isProcessing ? "Memproses..." : "Tolak & Refund Poin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
