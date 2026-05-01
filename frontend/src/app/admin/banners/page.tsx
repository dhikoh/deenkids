"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchBanners, toggleBanner, updateBanner, deleteBanner, API_BASE_URL } from "@/lib/api";
import { Image, Plus, Trash2, ToggleLeft, ToggleRight, Edit3, ExternalLink, Eye, MousePointerClick, AlertTriangle, X, Save } from "lucide-react";

export default function BannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editBanner, setEditBanner] = useState<any>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("0");
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = async () => {
    const token = Cookies.get("_at");
    if (!token) return;
    try {
      const res = await fetchBanners(token);
      setBanners(res.data || []);
    } catch { toast.error("Gagal memuat banner"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (id: string) => {
    const token = Cookies.get("_at");
    if (!token) return;
    try {
      const res = await toggleBanner(id, token);
      setBanners(prev => prev.map(b => b.id === id ? res.data : b));
      toast.success("Status banner diperbarui");
    } catch { toast.error("Gagal mengubah status"); }
  };

  const handleDelete = async (id: string) => {
    const token = Cookies.get("_at");
    if (!token) return;
    try {
      await deleteBanner(id, token);
      setBanners(prev => prev.filter(b => b.id !== id));
      toast.success("Banner dihapus");
    } catch { toast.error("Gagal menghapus"); }
    setConfirmDeleteId(null);
  };

  const handleCreate = async () => {
    if (!title || !imageFile) return toast.error("Judul dan gambar wajib diisi");
    setIsSaving(true);
    const token = Cookies.get("_at");
    if (!token) return;
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("image", imageFile);
      form.append("linkUrl", linkUrl);
      form.append("isActive", "true");
      form.append("priority", priority);
      if (startDate) form.append("startDate", startDate);
      if (endDate) form.append("endDate", endDate);
      if (notes) form.append("notes", notes);

      const res = await fetch(`${API_BASE_URL}/superadmin/banners`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBanners(prev => [data.data, ...prev]);
      toast.success("Banner berhasil dibuat!");
      resetForm();
    } catch { toast.error("Gagal membuat banner"); }
    finally { setIsSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editBanner) return;
    setIsSaving(true);
    const token = Cookies.get("_at");
    if (!token) return;
    try {
      const res = await updateBanner(editBanner.id, {
        title: editBanner.title,
        linkUrl: editBanner.linkUrl,
        startDate: editBanner.startDate || null,
        endDate: editBanner.endDate || null,
        priority: parseInt(editBanner.priority) || 0,
        notes: editBanner.notes || null,
      }, token);
      setBanners(prev => prev.map(b => b.id === editBanner.id ? res.data : b));
      toast.success("Banner diperbarui!");
      setEditBanner(null);
    } catch { toast.error("Gagal memperbarui"); }
    finally { setIsSaving(false); }
  };

  const resetForm = () => {
    setShowCreate(false); setTitle(""); setLinkUrl(""); setStartDate(""); setEndDate("");
    setPriority("0"); setNotes(""); setImageFile(null);
  };

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banner & Iklan</h1>
          <p className="text-slate-500">Kelola sponsor dan iklan banner yang tampil di homepage.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 text-sm">
          <Plus size={16} /> Tambah Banner
        </button>
      </div>

      {/* Banner List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> :
         banners.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada banner.</div> :
         <div className="divide-y divide-slate-100">
           {banners.map(b => (
             <div key={b.id} className="p-4 flex items-center gap-4">
               {/* Thumbnail */}
               <div className="w-20 h-20 rounded-xl border border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50">
                 <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" />
               </div>

               {/* Info */}
               <div className="flex-1 min-w-0">
                 <h3 className="font-bold text-slate-800 text-sm">{b.title}</h3>
                 <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                   <span className="flex items-center gap-1"><Eye size={12} /> {b.impressions} views</span>
                   <span className="flex items-center gap-1"><MousePointerClick size={12} /> {b.clicks} clicks</span>
                   <span>Prioritas: {b.priority}</span>
                 </div>
                 <div className="text-xs text-slate-400 mt-1">
                   {b.startDate || b.endDate ? `${formatDate(b.startDate)} → ${formatDate(b.endDate)}` : "Tanpa batas waktu"}
                 </div>
                 {b.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{b.notes}</p>}
               </div>

               {/* Actions */}
               <div className="flex items-center gap-2 flex-shrink-0">
                 <button onClick={() => handleToggle(b.id)} className={`p-2 rounded-lg transition-colors ${b.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-50"}`} title={b.isActive ? "Aktif" : "Nonaktif"}>
                   {b.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                 </button>
                 {b.linkUrl && <a href={b.linkUrl} target="_blank" rel="noopener" className="p-2 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg"><ExternalLink size={16} /></a>}
                 <button onClick={() => setEditBanner({ ...b, startDate: b.startDate?.split("T")[0] || "", endDate: b.endDate?.split("T")[0] || "" })} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><Edit3 size={16} /></button>
                 {confirmDeleteId === b.id ? (
                   <div className="flex gap-1">
                     <button onClick={() => handleDelete(b.id)} className="px-2 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded">Ya</button>
                     <button onClick={() => setConfirmDeleteId(null)} className="px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-50 rounded">Batal</button>
                   </div>
                 ) : (
                   <button onClick={() => setConfirmDeleteId(b.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                 )}
               </div>
             </div>
           ))}
         </div>}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={resetForm}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Tambah Banner Baru</h3>
              <button onClick={resetForm} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul/Nama Sponsor *" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium" />
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">Gambar Banner *</label>
                <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm" />
              </div>
              <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="URL Tujuan Klik (opsional)" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Mulai Tampil</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Berakhir</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={priority} onChange={e => setPriority(e.target.value)} placeholder="Prioritas (0)" type="number" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan internal (opsional)" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={resetForm} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Batal</button>
              <button onClick={handleCreate} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50">{isSaving ? "Menyimpan..." : "Simpan Banner"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBanner && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditBanner(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Edit Banner</h3>
              <button onClick={() => setEditBanner(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input value={editBanner.title} onChange={e => setEditBanner({ ...editBanner, title: e.target.value })} placeholder="Judul" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-medium" />
              <input value={editBanner.linkUrl || ""} onChange={e => setEditBanner({ ...editBanner, linkUrl: e.target.value })} placeholder="URL Tujuan Klik" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Mulai Tampil</label>
                  <input type="date" value={editBanner.startDate || ""} onChange={e => setEditBanner({ ...editBanner, startDate: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Berakhir</label>
                  <input type="date" value={editBanner.endDate || ""} onChange={e => setEditBanner({ ...editBanner, endDate: e.target.value })} className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={editBanner.priority} onChange={e => setEditBanner({ ...editBanner, priority: e.target.value })} type="number" placeholder="Prioritas" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
                <input value={editBanner.notes || ""} onChange={e => setEditBanner({ ...editBanner, notes: e.target.value })} placeholder="Catatan" className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditBanner(null)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200">Batal</button>
              <button onClick={handleUpdate} disabled={isSaving} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"><Save size={14} /> {isSaving ? "Menyimpan..." : "Simpan"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
