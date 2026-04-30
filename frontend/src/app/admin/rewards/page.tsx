"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Trophy, ArrowUpRight, ArrowDownLeft, Clock, Wallet, Banknote } from "lucide-react";
import { API_BASE_URL, apiFetch, authHeaders, fetchMyWithdrawals } from "@/lib/api";

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

export default function RewardsPage() {
  const [balance, setBalance] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ledger" | "withdrawals">("ledger");

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const [b, l, w] = await Promise.all([
        apiFetch(`${API_BASE_URL}/admin/points/balance`, { headers: authH(token) }),
        apiFetch(`${API_BASE_URL}/admin/points/ledger`, { headers: authH(token) }),
        fetchMyWithdrawals(token),
      ]);
      setBalance(b);
      setLedger(l.data || []);
      setWithdrawals(w.data || []);
    } catch { toast.error("Gagal memuat data reward"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseInt(withdrawAmount) <= 0) {
      toast.error("Masukkan jumlah poin yang valid"); return;
    }
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/admin/points/withdraw`, {
        method: "POST", headers: authH(token),
        body: JSON.stringify({ pointsAmount: parseInt(withdrawAmount) }),
      });
      toast.success(res.message);
      setShowForm(false); setWithdrawAmount(""); load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 bg-slate-100 rounded-2xl" />
      <div className="h-64 bg-slate-100 rounded-2xl" />
    </div>
  );
  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Reward Poin</h1>

      {/* Balance Card */}
      {balance && (
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-lg">
          <p className="text-sm opacity-80">Saldo Poin</p>
          <p className="text-4xl font-extrabold mt-1">{balance.points} <span className="text-lg font-normal opacity-70">poin</span></p>
          <p className="text-sm mt-2 opacity-80">≈ {formatRp(balance.rupiahValue)}</p>
          <div className="flex gap-3 mt-4 flex-wrap">
            <button onClick={() => setShowForm(!showForm)} className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1">
              <Wallet size={16} /> Tarik Reward
            </button>
            <span className="text-xs opacity-60 self-center">Min. {balance.minWithdrawal} poin • 1 poin = {formatRp(balance.pointToRupiah)}</span>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">Ajukan Withdrawal</h3>
          <div>
            <label className="text-sm font-semibold text-slate-700">Jumlah Poin</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder={`Min. ${balance?.minWithdrawal || 50}`}
              min={balance?.minWithdrawal || 50}
              max={balance?.points || 0}
            />
            {withdrawAmount && (
              <p className="text-xs text-slate-500 mt-1">
                = {formatRp(parseInt(withdrawAmount || "0") * (balance?.pointToRupiah || 1000))}
              </p>
            )}
          </div>
          <p className="text-xs text-amber-600">⚠️ Pastikan data rekening bank di halaman Profil sudah lengkap sebelum withdraw.</p>
          <div className="flex gap-2">
            <button onClick={handleWithdraw} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">Ajukan</button>
            <button onClick={() => { setShowForm(false); setWithdrawAmount(""); }} className="border border-slate-200 text-slate-600 font-bold py-2.5 px-6 rounded-xl hover:bg-slate-50 transition-colors">Batal</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab("ledger")}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === "ledger" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Clock size={16} /> Riwayat Poin
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={`flex-1 py-3 text-sm font-bold transition-colors flex items-center justify-center gap-2 ${activeTab === "withdrawals" ? "text-emerald-600 border-b-2 border-emerald-500" : "text-slate-500 hover:text-slate-700"}`}
          >
            <Banknote size={16} /> Riwayat Withdrawal {withdrawals.length > 0 && <span className="bg-slate-100 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">{withdrawals.length}</span>}
          </button>
        </div>

        {/* Ledger Tab */}
        {activeTab === "ledger" && (
          <div className="divide-y divide-slate-100">
            {ledger.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada riwayat poin.</div>
            ) : ledger.map(l => (
              <div key={l.id} className="p-4 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${l.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                  {l.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{l.reason}</p>
                  <p className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString("id-ID")}</p>
                </div>
                <span className={`font-extrabold flex-shrink-0 ${l.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {l.amount > 0 ? "+" : ""}{l.amount}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Withdrawals Tab */}
        {activeTab === "withdrawals" && (
          <div className="divide-y divide-slate-100">
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center text-slate-500">Belum ada riwayat withdrawal.</div>
            ) : withdrawals.map(w => (
              <div key={w.id} className="p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <Banknote size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-sm font-bold text-slate-800">{formatRp(w.rupiahAmount)} <span className="text-xs font-normal text-slate-400">({w.pointsAmount} poin)</span></p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[w.status]}`}>{statusLabels[w.status] || w.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">🏦 {w.bankName} • {w.bankAccount}</p>
                  {w.notes && <p className="text-xs text-slate-400 mt-1 italic">Catatan: {w.notes}</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(w.createdAt).toLocaleString("id-ID")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
