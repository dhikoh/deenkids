"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchDonationSubmissions, verifyDonation, fetchDonationReport, API_BASE_URL } from "@/lib/api";
import { CheckCircle, DollarSign, Image, TrendingUp } from "lucide-react";

export default function DonationInboxPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "report">("list");

  const load = async () => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      const [subs, rep] = await Promise.all([
        fetchDonationSubmissions(token),
        fetchDonationReport(token),
      ]);
      setSubmissions(subs.data || []);
      setReport(rep);
    } catch { toast.error("Gagal memuat data donasi"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleVerify = async (id: string) => {
    const token = Cookies.get("access_token");
    if (!token) return;
    try {
      await verifyDonation(id, token);
      toast.success("Donasi diverifikasi");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Donasi Masuk</h1><p className="text-slate-500">Verifikasi donasi dan lihat laporan keuangan.</p></div>
        <div className="flex gap-2">
          <button onClick={() => setTab("list")} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === "list" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>Daftar</button>
          <button onClick={() => setTab("report")} className={`px-4 py-2 rounded-xl text-sm font-bold ${tab === "report" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>Laporan</button>
        </div>
      </div>

      {tab === "report" && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Total Donasi Terverifikasi</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{formatRp(report.totalAmount)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm text-slate-500">Jumlah Donatur</p>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{report.totalCount}</p>
            </div>
          </div>
          {report.byMonth && Object.keys(report.byMonth).length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><TrendingUp size={18} /> Per Bulan</h3>
              <div className="space-y-2">
                {Object.entries(report.byMonth).map(([month, data]: [string, any]) => (
                  <div key={month} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="font-bold text-slate-700">{month}</span>
                    <div className="text-right">
                      <span className="text-emerald-600 font-bold">{formatRp(data.total)}</span>
                      <span className="text-xs text-slate-400 ml-2">({data.count} donatur)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "list" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {submissions.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada donasi masuk.</div> :
           submissions.map(d => (
            <div key={d.id} className="p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${d.isVerified ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                <DollarSign size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-slate-800">{d.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${d.isVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{d.isVerified ? "Terverifikasi" : "Menunggu"}</span>
                </div>
                <p className="text-lg font-extrabold text-emerald-600">{formatRp(d.amount)}</p>
                <p className="text-sm text-slate-500">Metode: <span className="font-bold uppercase">{d.method}</span></p>
                {d.message && <p className="text-sm text-slate-500 mt-1 italic">&ldquo;{d.message}&rdquo;</p>}
                <p className="text-xs text-slate-400 mt-1">{new Date(d.createdAt).toLocaleString("id-ID")}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 items-center">
                {d.proofUrl && <a href={`${API_BASE_URL.replace('/api', '')}${d.proofUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100" title="Lihat Bukti"><Image size={16} /></a>}
                {!d.isVerified && <button onClick={() => handleVerify(d.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Verifikasi"><CheckCircle size={16} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
