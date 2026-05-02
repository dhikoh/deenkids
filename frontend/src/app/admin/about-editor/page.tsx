"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Save, Plus, Trash2, GripVertical } from "lucide-react";
import { fetchPageContentAdmin, updatePageContent } from "@/lib/api";

export default function AboutEditorPage() {
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = Cookies.get("_at"); if (!token) return;
    fetchPageContentAdmin("about", token).then(r => {
      setTitle(r.data?.title || "Tentang Adably");
      setSections(r.data?.content?.sections || []);
    }).catch(() => {
      setSections([
        { type: "hero", title: "Tentang Adably", subtitle: "Platform Edukasi Parenting Islami" },
        { type: "text", title: "Misi Kami", body: "" },
      ]);
    }).finally(() => setLoading(false));
  }, []);

  const addSection = () => {
    setSections([...sections, { type: "text", title: "", body: "" }]);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const updateSection = (index: number, field: string, value: string) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  const handleSave = async () => {
    const token = Cookies.get("_at"); if (!token) return;
    setSaving(true);
    try {
      await updatePageContent("about", { title, content: { sections } }, token);
      toast.success("Halaman Tentang Kami berhasil disimpan!");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Halaman Tentang Kami</h1>
          <p className="text-slate-500">Edit konten halaman publik /tentang-kami</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50">
          <Save size={16} /> {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <label className="block text-sm font-semibold text-slate-700">Judul Halaman</label>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
      </div>

      {sections.map((section, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="text-slate-300" />
              <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{section.type === "hero" ? "Hero" : "Teks"}</span>
            </div>
            {section.type !== "hero" && (
              <button onClick={() => removeSection(i)} className="p-1 text-rose-400 hover:text-rose-600"><Trash2 size={16} /></button>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">{section.type === "hero" ? "Judul Hero" : "Judul Section"}</label>
            <input value={section.title || ""} onChange={e => updateSection(i, "title", e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
          </div>
          {section.type === "hero" ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Subtitle</label>
              <input value={section.subtitle || ""} onChange={e => updateSection(i, "subtitle", e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5" />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Isi Konten</label>
              <textarea value={section.body || ""} onChange={e => updateSection(i, "body", e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 min-h-[120px]" />
            </div>
          )}
        </div>
      ))}

      <button onClick={addSection} className="w-full border-2 border-dashed border-slate-200 hover:border-emerald-300 rounded-2xl p-4 text-sm font-bold text-slate-400 hover:text-emerald-600 flex items-center justify-center gap-2 transition-colors">
        <Plus size={18} /> Tambah Section
      </button>
    </div>
  );
}
