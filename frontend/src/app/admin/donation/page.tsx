"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchDonationAdmin, updateDonationAdmin } from "@/lib/api";
import { Gift, Plus, Trash2, Save } from "lucide-react";

export default function DonationPage() {
  const [enabled, setEnabled] = useState(false);
  const [title, setTitle] = useState("Dukung Adably 🌱");
  const [message, setMessage] = useState("");
  const [methods, setMethods] = useState<{ type: string; label: string; value: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (token) {
      fetchDonationAdmin(token).then(d => {
        setEnabled(d.enabled); setTitle(d.title); setMessage(d.message); setMethods(d.methods || []);
      }).catch(() => {}).finally(() => setIsLoading(false));
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    const token = Cookies.get("access_token");
    try {
      await updateDonationAdmin({ enabled, title, message, methods }, token || "");
      toast.success("Pengaturan donasi disimpan");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSaving(false); }
  };

  if (isLoading) return <div className="p-8 text-center">Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Pengaturan Donasi</h1><p className="text-slate-500">Kelola tampilan popup donasi dan metode pembayaran.</p></div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div><p className="font-semibold text-slate-700">Aktifkan Popup Donasi</p><p className="text-sm text-slate-500">Muncul setelah user melakukan like atau membaca konten.</p></div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <div className="w-14 h-7 bg-slate-200 peer-checked:bg-emerald-600 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
        </div>

        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Judul Popup</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
        <div><label className="block text-sm font-semibold text-slate-700 mb-1">Pesan</label><textarea value={message} onChange={e => setMessage(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 min-h-[80px]" /></div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="text-sm font-semibold text-slate-700">Metode Donasi</label>
            <button onClick={() => setMethods([...methods, { type: "bank", label: "", value: "" }])} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1"><Plus size={14} /> Tambah</button>
          </div>
          <div className="space-y-3">
            {methods.map((m, i) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                <select value={m.type} onChange={e => { const n = [...methods]; n[i].type = e.target.value; setMethods(n); }} className="border border-slate-300 rounded-lg p-2 text-sm font-bold w-32">
                  <option value="bank">Bank Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="saweria">Saweria</option>
                  <option value="other">Lainnya</option>
                </select>
                <input type="text" value={m.label} onChange={e => { const n = [...methods]; n[i].label = e.target.value; setMethods(n); }} placeholder="Label (BSI / BCA / Saweria)" className="flex-1 border border-slate-300 rounded-lg p-2 text-sm" />
                <input type="text" value={m.value} onChange={e => { const n = [...methods]; n[i].value = e.target.value; setMethods(n); }} placeholder="No Rek / URL / QRIS URL" className="flex-1 border border-slate-300 rounded-lg p-2 text-sm" />
                <button onClick={() => setMethods(methods.filter((_, j) => j !== i))} className="p-2 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-70">
          <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}
