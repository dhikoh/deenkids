"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Save, MessageCircle } from "lucide-react";
import { fetchPageContentAdmin, updatePageContent } from "@/lib/api";

export default function ContactEditorPage() {
  const [form, setForm] = useState({ whatsapp: "", displayName: "CS Adably", defaultMessage: "Assalamualaikum, saya ingin bertanya tentang Adably.", isActive: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = Cookies.get("_at"); if (!token) return;
    fetchPageContentAdmin("contact", token).then(r => {
      if (r.data?.content) setForm({ ...form, ...r.data.content });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const token = Cookies.get("_at"); if (!token) return;
    setSaving(true);
    try {
      await updatePageContent("contact", { title: "Kontak CS", content: form }, token);
      toast.success("Pengaturan kontak CS berhasil disimpan!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Kontak CS</h1>
          <p className="text-slate-500">Atur informasi kontak yang tampil di footer dan halaman Tentang Kami.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><MessageCircle size={18} /> Status</h3>
            <p className="text-xs text-slate-400">Tampilkan kontak CS di halaman publik</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="sr-only peer" />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nomor WhatsApp</label>
          <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+6281234567890" className="w-full border border-slate-300 rounded-lg p-2.5" />
          <p className="text-xs text-slate-400 mt-1">Format internasional: +62xxx (tanpa spasi)</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Tampilan</label>
          <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5" />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Pesan Default</label>
          <textarea value={form.defaultMessage} onChange={e => setForm({ ...form, defaultMessage: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 min-h-[80px]" />
          <p className="text-xs text-slate-400 mt-1">Pesan ini akan otomatis terisi saat pengunjung klik kontak WA.</p>
        </div>
      </div>

      {/* Preview */}
      {form.isActive && form.whatsapp && (
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <h3 className="font-bold text-slate-800 mb-3">Preview</h3>
          <a
            href={`https://wa.me/${form.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(form.defaultMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl"
          >
            <MessageCircle size={18} /> Chat via WhatsApp — {form.displayName}
          </a>
        </div>
      )}
    </div>
  );
}
