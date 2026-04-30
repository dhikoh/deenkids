"use client";

import { useState, useEffect } from "react";
import { Gift, CreditCard, QrCode, ExternalLink, Upload, Send } from "lucide-react";
import { fetchDonationSettings, submitPublicDonation } from "@/lib/api";
import toast from "react-hot-toast";

export default function LandingDonation() {
  const [settings, setSettings] = useState<any>(null);
  const [form, setForm] = useState({ name: "", amount: "", method: "bank", message: "" });
  const [proof, setProof] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchDonationSettings().then(d => setSettings(d)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.amount) return toast.error("Nama dan jumlah wajib diisi");
    setIsSending(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("amount", form.amount);
      fd.append("method", form.method);
      if (form.message) fd.append("message", form.message);
      if (proof) fd.append("proof", proof);
      const res = await submitPublicDonation(fd);
      toast.success(res.message || "Terima kasih!");
      setForm({ name: "", amount: "", method: "bank", message: "" });
      setProof(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSending(false); }
  };

  if (!settings?.enabled) return null;

  const iconMap: Record<string, any> = {
    bank: <CreditCard size={18} className="text-emerald-600" />,
    qris: <QrCode size={18} className="text-sky-600" />,
    saweria: <Gift size={18} className="text-amber-600" />,
    other: <ExternalLink size={18} className="text-slate-600" />,
  };

  const formatRp = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  return (
    <section className="py-20 bg-gradient-to-br from-emerald-50 to-teal-50" id="donasi">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-800">{settings.title}</h2>
          <p className="text-slate-600 mt-3 max-w-xl mx-auto">{settings.message}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left: Methods + Testimonials */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4">Metode Donasi</h3>
              <div className="space-y-3">
                {settings.methods?.map((m: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {iconMap[m.type] || iconMap.other}
                    <div className="flex-1">
                      <p className="font-bold text-slate-800 text-sm">{m.label}</p>
                      {m.type === "bank" ? (
                        <p className="text-xs text-slate-500 font-mono">{m.value}</p>
                      ) : (
                        <a href={m.value} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline">{m.value}</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {testimonials.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4">Donatur Terverifikasi ❤️</h3>
                <div className="space-y-2">
                  {testimonials.slice(0, 5).map((t: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
                      <div>
                        <span className="font-bold text-slate-700">{t.name}</span>
                        {t.message && <p className="text-xs text-slate-500 mt-0.5 italic">&ldquo;{t.message}&rdquo;</p>}
                      </div>
                      <span className="font-bold text-emerald-600">{formatRp(t.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Form */}
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 mb-2">Konfirmasi Donasi</h3>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Nama Anda / Hamba Allah" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Jumlah (Rp)</label>
                <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="50000" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Metode</label>
                <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5">
                  <option value="bank">Bank Transfer</option>
                  <option value="qris">QRIS</option>
                  <option value="saweria">Saweria</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Pesan (opsional)</label>
              <input type="text" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5" placeholder="Semoga bermanfaat..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Bukti Transfer</label>
              <label className="flex items-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-emerald-400 transition-colors">
                <Upload size={18} className="text-slate-400" />
                <span className="text-sm text-slate-500">{proof ? proof.name : "Klik untuk upload gambar"}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setProof(e.target.files?.[0] || null)} />
              </label>
            </div>
            <button type="submit" disabled={isSending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
              <Send size={18} /> {isSending ? "Mengirim..." : "Kirim Konfirmasi Donasi"}
            </button>
            <p className="text-center text-xs text-slate-400">Jazaakumullaahu khairan 🤲</p>
          </form>
        </div>
      </div>
    </section>
  );
}
