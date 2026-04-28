"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { CheckCircle, XCircle, Banknote, Clock } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const apiFetch = async (url: string, opts: RequestInit = {}) => { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Error"); } return r.json(); };

const statusColors: Record<string, string> = { PENDING: "bg-amber-100 text-amber-700", APPROVED: "bg-sky-100 text-sky-700", REJECTED: "bg-rose-100 text-rose-700", DISBURSED: "bg-emerald-100 text-emerald-700" };
const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

export default function WithdrawalInboxPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { const r = await apiFetch(`${API}/superadmin/withdrawals`, { headers: authH(token) }); setData(r.data || []); }
    catch { toast.error("Gagal memuat"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const process = async (id: string, action: string, notes = "") => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { await apiFetch(`${API}/superadmin/withdrawals/${id}/process`, { method: "PUT", headers: authH(token), body: JSON.stringify({ action, notes }) }); toast.success(`Withdrawal ${action.toLowerCase()}`); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Withdrawal Requests</h1>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {data.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada permintaan withdrawal.</div> :
         data.map(w => (
          <div key={w.id} className="p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0"><Banknote size={18} /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-slate-800">{w.user?.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusColors[w.status]}`}>{w.status}</span>
              </div>
              <p className="text-lg font-extrabold text-emerald-600">{formatRp(w.rupiahAmount)} <span className="text-sm font-normal text-slate-500">({w.pointsAmount} poin)</span></p>
              <p className="text-sm text-slate-500">🏦 {w.bankName} • {w.bankAccount} • a.n. {w.bankHolder}</p>
              {w.notes && <p className="text-xs text-slate-400 mt-1 italic">Catatan: {w.notes}</p>}
              <p className="text-xs text-slate-400 mt-1">{new Date(w.createdAt).toLocaleString("id-ID")}</p>
            </div>
            {w.status === "PENDING" && (
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => process(w.id, "APPROVED")} className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100" title="Approve"><CheckCircle size={16} /></button>
                <button onClick={() => process(w.id, "REJECTED", prompt("Alasan penolakan:") || "")} className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="Reject"><XCircle size={16} /></button>
              </div>
            )}
            {w.status === "APPROVED" && (
              <button onClick={() => process(w.id, "DISBURSED")} className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700">Sudah Transfer</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
