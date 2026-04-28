"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { submitPublicFeedback } from "@/lib/api";
import toast from "react-hot-toast";

export default function LandingFeedback() {
  const [form, setForm] = useState({ name: "", email: "", type: "saran", message: "" });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.message) return toast.error("Nama dan pesan wajib diisi");
    setIsSending(true);
    try {
      const res = await submitPublicFeedback(form);
      toast.success(res.message || "Terima kasih!");
      setForm({ name: "", email: "", type: "saran", message: "" });
    } catch (e: any) { toast.error(e.message); }
    finally { setIsSending(false); }
  };

  return (
    <section className="py-20 bg-white" id="kritik-saran">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-full text-teal-700 font-bold text-sm mb-4">
            <MessageSquare size={16} /> Kritik & Saran
          </div>
          <h2 className="text-3xl font-extrabold text-slate-800">Bantu Kami Lebih Baik</h2>
          <p className="text-slate-500 mt-2">Masukan Anda sangat berharga untuk pengembangan Adably.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nama</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" placeholder="Nama Anda" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Email (opsional)</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 bg-white" placeholder="email@contoh.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis</label>
            <div className="flex gap-2">
              {[{ value: "kritik", label: "Kritik" }, { value: "saran", label: "Saran" }, { value: "pertanyaan", label: "Pertanyaan" }].map(t => (
                <button type="button" key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${form.type === t.value ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-300 hover:border-emerald-400"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Pesan</label>
            <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 bg-white min-h-[100px]" placeholder="Tulis masukan Anda di sini..." />
          </div>
          <button type="submit" disabled={isSending} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
            <Send size={18} /> {isSending ? "Mengirim..." : "Kirim Masukan"}
          </button>
        </form>
      </div>
    </section>
  );
}
