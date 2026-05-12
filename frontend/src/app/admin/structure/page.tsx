"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { fetchStructure, createStructureNode, updateStructureNode, deleteStructureNode, bulkMoveNodeContents } from "@/lib/api";
import { FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, X, ArrowRight, AlertTriangle } from "lucide-react";

export default function StructurePage() {
  const [tree, setTree] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", type: "CATEGORY", parentId: "", description: "", ageGroups: ["3-5", "5-7", "7-10", "10-13"], order: 0 });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Safe delete state
  const [deleteModal, setDeleteModal] = useState<{ nodeId: string; title: string; contentCount: number; childCount: number } | null>(null);
  const [moveTargetId, setMoveTargetId] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const load = async () => {
    const token = Cookies.get("_at");
    if (!token) return;
    try { const res = await fetchStructure(token, 'PEMBELAJARAN'); setTree(res.data || []); }
    catch { toast.error("Gagal memuat struktur"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const handleSave = async () => {
    const token = Cookies.get("_at");
    if (!token || !form.title) return toast.error("Nama wajib diisi");
    try {
      const payload = { ...form, parentId: form.parentId || null };
      if (editingId) {
        await updateStructureNode(editingId, payload, token);
        toast.success("Node diperbarui");
      } else {
        await createStructureNode({ ...payload, group: 'PEMBELAJARAN' }, token);
        toast.success("Node ditambahkan");
      }
      setShowForm(false); setEditingId(null);
      setForm({ title: "", type: "CATEGORY", parentId: "", description: "", ageGroups: ["3-5", "5-7", "7-10", "10-13"], order: 0 });
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDeleteClick = (node: any) => {
    const contentCount = node.contentCount || 0;
    const childCount = node.children?.length || 0;
    setDeleteModal({ nodeId: node.id, title: node.title, contentCount, childCount });
    setMoveTargetId("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    const token = Cookies.get("_at");
    if (!token) return;
    setIsDeleting(true);

    try {
      // If has content, move first
      if (deleteModal.contentCount > 0 && moveTargetId) {
        await bulkMoveNodeContents(deleteModal.nodeId, moveTargetId, token);
        toast.success(`${deleteModal.contentCount} konten dipindahkan`);
      }

      // Then delete
      await deleteStructureNode(deleteModal.nodeId, token);
      toast.success("Node dihapus");
      setDeleteModal(null);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const startEdit = (node: any) => {
    setForm({ title: node.title, type: node.type, parentId: node.parentId || "", description: node.description || "", ageGroups: node.ageGroups || [], order: node.order });
    setEditingId(node.id); setShowForm(true);
  };

  const flatAll = (nodes: any[], prefix = "", excludeId?: string): any[] => {
    let r: any[] = [];
    for (const n of nodes) {
      if (n.id !== excludeId) {
        r.push({ id: n.id, label: prefix ? `${prefix} > ${n.title}` : n.title });
      }
      if (n.children?.length) r = r.concat(flatAll(n.children, prefix ? `${prefix} > ${n.title}` : n.title, excludeId));
    }
    return r;
  };

  const renderTree = (nodes: any[], depth = 0) => nodes.map((node: any) => (
    <div key={node.id}>
      <div className={`flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group`} style={{ paddingLeft: `${depth * 24 + 12}px` }}>
        <div className="flex items-center gap-2 flex-1 cursor-pointer" onClick={() => node.children?.length && toggle(node.id)}>
          {node.children?.length ? (expanded.has(node.id) ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />) : <span className="w-4" />}
          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${node.type === "CATEGORY" ? "bg-emerald-100 text-emerald-700" : node.type === "MODULE" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}`}>{node.type === "CATEGORY" ? "Kategori" : node.type === "MODULE" ? "Modul" : "Topik"}</span>
          <span className="font-bold text-slate-800">{node.title}</span>
          <span className="text-xs text-slate-400 ml-2">({node.contentCount || 0} konten)</span>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setForm({ title: "", type: node.type === "CATEGORY" ? "MODULE" : "TOPIC", parentId: node.id, description: "", ageGroups: ["3-5", "5-7", "7-10", "10-13"], order: 0 }); setEditingId(null); setShowForm(true); }} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100" title="Tambah sub-node"><Plus size={14} /></button>
          <button onClick={() => startEdit(node)} className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Edit"><Edit2 size={14} /></button>
          <button onClick={() => handleDeleteClick(node)} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100" title="Hapus"><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded.has(node.id) && node.children?.length > 0 && renderTree(node.children, depth + 1)}
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-800">Kelola Struktur Pembelajaran</h1><p className="text-slate-500">Atur hierarki Kategori, Modul, dan Topik.</p></div>
        <button onClick={() => { setForm({ title: "", type: "CATEGORY", parentId: "", description: "", ageGroups: ["3-5", "5-7", "7-10", "10-13"], order: 0 }); setEditingId(null); setShowForm(true); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold shadow-sm flex items-center gap-2"><Plus size={18} /> Tambah Kategori</button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-md space-y-4">
          <div className="flex justify-between"><h3 className="font-bold text-slate-800">{editingId ? "Edit Node" : "Tambah Node Baru"}</h3><button onClick={() => setShowForm(false)}><X size={20} className="text-slate-400" /></button></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Nama</label><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Tipe</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5">
                <option value="CATEGORY">Kategori</option><option value="MODULE">Modul</option><option value="TOPIC">Topik</option>
              </select>
            </div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Parent</label>
              <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5">
                <option value="">— Root (Tanpa Parent) —</option>
                {flatAll(tree).map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Urutan</label><input type="number" value={form.order} onChange={e => setForm({ ...form, order: parseInt(e.target.value) || 0 })} className="w-full border border-slate-300 rounded-lg p-2.5" /></div>
          </div>
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 min-h-[60px]" /></div>
          <button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold">{editingId ? "Perbarui" : "Simpan"}</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {isLoading ? <div className="p-8 text-center text-slate-500">Memuat...</div> : tree.length === 0 ? <div className="p-8 text-center text-slate-500">Belum ada struktur. Tambahkan kategori pertama.</div> : renderTree(tree)}
      </div>

      {/* Safe Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !isDeleting && setDeleteModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-xl"><AlertTriangle size={20} className="text-rose-600" /></div>
              <h3 className="font-bold text-slate-800">Hapus &quot;{deleteModal.title}&quot;?</h3>
            </div>

            {deleteModal.childCount > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800 font-medium">
                  ⚠️ Node ini memiliki <strong>{deleteModal.childCount} sub-node</strong>. Hapus semua sub-node terlebih dahulu sebelum menghapus node ini.
                </p>
              </div>
            ) : deleteModal.contentCount > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium">
                    ⚠️ Node ini memiliki <strong>{deleteModal.contentCount} konten</strong>. Pindahkan konten ke node lain sebelum menghapus.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    <ArrowRight size={14} className="inline mr-1" />Pindahkan semua konten ke:
                  </label>
                  <select
                    value={moveTargetId}
                    onChange={e => setMoveTargetId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5"
                  >
                    <option value="">— Pilih node tujuan —</option>
                    {flatAll(tree, "", deleteModal.nodeId).map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-600">Node ini kosong dan akan dihapus permanen.</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteModal(null)} disabled={isDeleting} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
              {deleteModal.childCount === 0 && (
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting || (deleteModal.contentCount > 0 && !moveTargetId)}
                  className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? "Memproses..." : deleteModal.contentCount > 0 ? "Pindahkan & Hapus" : "Hapus"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
