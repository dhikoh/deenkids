"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Trophy, ArrowUpRight, ArrowDownLeft, Clock, Wallet } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const apiFetch = async (url: string, opts: RequestInit = {}) => { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Error"); } return r.json(); };

export default function RewardsPage() {
  const [balance, setBalance] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const [b, l] = await Promise.all([
        apiFetch(`${API_BASE_URL}/admin/points/balance`, { headers: authH(token) }),
        apiFetch(`${API_BASE_URL}/admin/points/ledger`, { headers: authH(token) }),
      ]);
      setBalance(b); setLedger(l.data || []);
    } catch { toast.error("Gagal memuat data reward"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleWithdraw = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const res = await apiFetch(`${API_BASE_URL}/admin/points/withdraw`, { method: "POST", headers: authH(token), body: JSON.stringify({ pointsAmount: parseInt(withdrawAmount) }) });
      toast.success(res.message); setShowForm(false); setWithdrawAmount(""); load();
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;
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
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(!showForm)} className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-1"><Wallet size={16} /> Tarik Reward</button>
            <span className="text-xs opacity-60 self-center">Min. {balance.minWithdrawal} poin</span>
          </div>
        </div>
      )}

      {/* Withdraw Form */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">Ajukan Withdrawal</h3>
          <div>
            <label className="text-sm font-semibold text-slate-700">Jumlah Poin</label>
            <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" placeholder="50" />
            {withdrawAmount && <p className="text-xs text-slate-500 mt-1">= {formatRp(parseInt(withdrawAmount || "0") * (balance?.pointToRupiah || 1000))}</p>}
          </div>
          <p className="text-xs text-amber-600">⚠️ Pastikan data rekening bank di halaman Profil sudah lengkap sebelum withdraw.</p>
          <button onClick={handleWithdraw} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl">Ajukan</button>
        </div>
      )}

      {/* Ledger */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18} /> Riwayat Poin</h3></div>
        <div className="divide-y divide-slate-100">
          {ledger.length === 0 ? <div className="p-6 text-center text-slate-500">Belum ada riwayat poin.</div> :
           ledger.map(l => (
            <div key={l.id} className="p-4 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${l.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"}`}>
                {l.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{l.reason}</p>
                <p className="text-xs text-slate-400">{new Date(l.createdAt).toLocaleString("id-ID")}</p>
              </div>
              <span className={`font-extrabold ${l.amount > 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.amount > 0 ? "+" : ""}{l.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
