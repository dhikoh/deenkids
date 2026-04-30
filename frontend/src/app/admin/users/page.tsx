"use client";

import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Users, Shield, Edit2, Trash2, KeyRound, UserPlus, X, Eye, EyeOff, Copy, Lock } from "lucide-react";
import { fetchUsersList, apiFetch, authHeaders, API_BASE_URL } from "@/lib/api";
const authH = authHeaders;

const roleColors: Record<string, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  AUTHOR: "bg-sky-100 text-sky-700 border-sky-200",
};
const roleDesc: Record<string, string> = {
  AUTHOR: "Menulis & submit konten",
  ADMIN: "Review, kelola konten & struktur",
  SUPERADMIN: "Akses penuh seluruh sistem",
};

type ModalType = "create" | "edit" | "reset" | "setpw" | "delete" | null;

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalType>(null);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [callerRole, setCallerRole] = useState("");

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formRole, setFormRole] = useState("AUTHOR");
  const [formPassword, setFormPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPw, setGeneratedPw] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const token = Cookies.get("access_token"); if (!token) return;
      const stored = localStorage.getItem("user");
      if (stored) setCallerRole(JSON.parse(stored).role || "");
      const data = await fetchUsersList(token);
      setUsers(Array.isArray(data) ? data : []);
    } catch { toast.error("Gagal memuat daftar pengguna"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const allowedRoles = callerRole === "SUPERADMIN" ? ["AUTHOR", "ADMIN"] : callerRole === "ADMIN" ? ["AUTHOR"] : [];

  const openCreate = () => {
    setFormName(""); setFormEmail(""); setFormPhone(""); setFormRole("AUTHOR"); setFormPassword(""); setGeneratedPw("");
    setTargetUser(null); setModal("create");
  };

  const openEdit = (u: any) => {
    setFormName(u.name); setFormEmail(u.email); setFormPhone(u.phone || ""); setFormRole(u.role);
    setTargetUser(u); setModal("edit");
  };

  const openReset = (u: any) => { setTargetUser(u); setGeneratedPw(""); setModal("reset"); };
  const openSetPw = (u: any) => { setTargetUser(u); setFormPassword(""); setModal("setpw"); };
  const openDelete = (u: any) => { setTargetUser(u); setModal("delete"); };

  const closeModal = () => { setModal(null); setTargetUser(null); setSaving(false); };

  const handleCreate = async () => {
    if (!formName || !formEmail || !formPassword) return toast.error("Semua field wajib diisi");
    setSaving(true);
    const token = Cookies.get("access_token");
    try {
      await apiFetch(`${API_BASE_URL}/admin/users`, { method: "POST", headers: authH(token || ""), body: JSON.stringify({ name: formName, email: formEmail, phone: formPhone || undefined, role: formRole, password: formPassword }) });
      toast.success("User berhasil dibuat"); closeModal(); loadUsers();
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  };

  const handleEdit = async () => {
    if (!targetUser) return;
    setSaving(true);
    const token = Cookies.get("access_token");
    try {
      await apiFetch(`${API_BASE_URL}/admin/users/${targetUser.id}`, { method: "PUT", headers: authH(token || ""), body: JSON.stringify({ name: formName, email: formEmail, phone: formPhone, role: formRole }) });
      toast.success("User berhasil diperbarui"); closeModal(); loadUsers();
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  };

  const handleReset = async () => {
    if (!targetUser) return;
    setSaving(true);
    const token = Cookies.get("access_token");
    try {
      const res = await apiFetch(`${API_BASE_URL}/admin/users/${targetUser.id}/reset-password`, { method: "PUT", headers: authH(token || "") });
      setGeneratedPw(res.newPassword); toast.success("Password berhasil direset");
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleSetPw = async () => {
    if (!targetUser || !formPassword) return toast.error("Password wajib diisi");
    setSaving(true);
    const token = Cookies.get("access_token");
    try {
      await apiFetch(`${API_BASE_URL}/admin/users/${targetUser.id}/set-password`, { method: "PUT", headers: authH(token || ""), body: JSON.stringify({ password: formPassword }) });
      toast.success("Password berhasil diubah"); closeModal();
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  };

  const handleDelete = async () => {
    if (!targetUser) return;
    setSaving(true);
    const token = Cookies.get("access_token");
    try {
      await apiFetch(`${API_BASE_URL}/admin/users/${targetUser.id}`, { method: "DELETE", headers: authH(token || "") });
      toast.success("User berhasil dihapus"); closeModal(); loadUsers();
    } catch (e: any) { toast.error(e.message); setSaving(false); }
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Tersalin!"); };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat pengguna...</div>;

  const canManage = (targetRole: string) => {
    const levels: Record<string, number> = { AUTHOR: 1, ADMIN: 2, SUPERADMIN: 3 };
    return (levels[callerRole] || 0) > (levels[targetRole] || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen User</h1>
          <p className="text-slate-500">Kelola akun, role, dan akses pengguna platform.</p>
        </div>
        <button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-colors">
          <UserPlus size={18} /> Tambah User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">Pengguna</th>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">Role</th>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">No. HP</th>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">Konten</th>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">Poin</th>
                <th className="text-left p-4 text-[10px] font-bold text-slate-500 uppercase">Bergabung</th>
                <th className="text-right p-4 text-[10px] font-bold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold uppercase text-sm shrink-0">{u.name?.substring(0, 2)}</div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                        <p className="text-[11px] text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4"><span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${roleColors[u.role]}`}>{u.role}</span></td>
                  <td className="p-4 text-sm text-slate-600">{u.phone || "—"}</td>
                  <td className="p-4 text-sm font-medium text-slate-600">{u._count?.contentItems ?? 0}</td>
                  <td className="p-4 text-sm font-bold text-emerald-600">{u.points ?? 0}</td>
                  <td className="p-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                  <td className="p-4">
                    {canManage(u.role) ? (
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(u)} className="p-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors" title="Edit"><Edit2 size={15} /></button>
                        <button onClick={() => openReset(u)} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors" title="Reset Password"><KeyRound size={15} /></button>
                        {callerRole === "SUPERADMIN" && <button onClick={() => openSetPw(u)} className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors" title="Set Password"><Lock size={15} /></button>}
                        <button onClick={() => openDelete(u)} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-colors" title="Hapus"><Trash2 size={15} /></button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 block text-right">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>

            {/* CREATE / EDIT */}
            {(modal === "create" || modal === "edit") && (
              <>
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white flex items-center gap-3">
                  {modal === "create" ? <UserPlus size={22} /> : <Edit2 size={22} />}
                  <h3 className="text-lg font-extrabold">{modal === "create" ? "Tambah User Baru" : `Edit: ${targetUser?.name}`}</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700">Nama *</label>
                    <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Nama lengkap" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700">Email *</label>
                    <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 focus:border-emerald-500 focus:ring-emerald-500" placeholder="email@contoh.com" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700">No. HP</label>
                    <input value={formPhone} onChange={e => setFormPhone(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 focus:border-emerald-500 focus:ring-emerald-500" placeholder="08xxxxxxxxxx" />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700">Role</label>
                    <div className="space-y-2 mt-2">
                      {allowedRoles.map(role => (
                        <button key={role} onClick={() => setFormRole(role)} className={`w-full p-3 rounded-xl border text-left font-bold text-sm transition-all ${formRole === role ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                          <Shield size={14} className="inline mr-2" />{role}
                          <span className="text-xs font-normal text-slate-400 ml-2">— {roleDesc[role]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {modal === "create" && (
                    <div>
                      <label className="text-sm font-bold text-slate-700">Password *</label>
                      <div className="relative mt-1">
                        <input type={showPassword ? "text" : "password"} value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Min. 6 karakter" />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 p-4 border-t border-slate-100">
                  <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                  <button onClick={modal === "create" ? handleCreate : handleEdit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </>
            )}

            {/* RESET PASSWORD */}
            {modal === "reset" && (
              <>
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white flex items-center gap-3">
                  <KeyRound size={22} />
                  <h3 className="text-lg font-extrabold">Reset Password</h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">Reset password untuk <span className="font-bold text-slate-800">{targetUser?.name}</span> ({targetUser?.email})?</p>
                  <p className="text-xs text-slate-500">Sistem akan generate password baru secara acak.</p>
                  {generatedPw && (
                    <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2">
                      <p className="text-sm font-bold text-emerald-800">✅ Password baru:</p>
                      <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-emerald-100">
                        <code className="flex-1 font-mono text-lg font-bold text-slate-800">{generatedPw}</code>
                        <button onClick={() => copyToClipboard(generatedPw)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><Copy size={16} /></button>
                      </div>
                      <p className="text-[10px] text-amber-600">⚠️ Catat password ini! Tidak bisa dilihat lagi setelah modal ditutup.</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 p-4 border-t border-slate-100">
                  <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">{generatedPw ? "Tutup" : "Batal"}</button>
                  {!generatedPw && <button onClick={handleReset} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 disabled:opacity-50">{saving ? "Mereset..." : "Reset Password"}</button>}
                </div>
              </>
            )}

            {/* SET PASSWORD (SuperAdmin only) */}
            {modal === "setpw" && (
              <>
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-5 text-white flex items-center gap-3">
                  <Lock size={22} />
                  <h3 className="text-lg font-extrabold">Set Password</h3>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-600">Set password baru untuk <span className="font-bold text-slate-800">{targetUser?.name}</span></p>
                  <div>
                    <label className="text-sm font-bold text-slate-700">Password Baru *</label>
                    <div className="relative mt-1">
                      <input type={showPassword ? "text" : "password"} value={formPassword} onChange={e => setFormPassword(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 pr-10 focus:border-emerald-500 focus:ring-emerald-500" placeholder="Min. 6 karakter" />
                      <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 p-4 border-t border-slate-100">
                  <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                  <button onClick={handleSetPw} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Set Password"}</button>
                </div>
              </>
            )}

            {/* DELETE */}
            {modal === "delete" && (
              <>
                <div className="bg-gradient-to-r from-rose-500 to-red-600 p-5 text-white flex items-center gap-3">
                  <Trash2 size={22} />
                  <h3 className="text-lg font-extrabold">Hapus User</h3>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-slate-600">Yakin ingin menghapus user <span className="font-bold text-slate-800">{targetUser?.name}</span>?</p>
                  <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-lg">⚠️ Semua konten, poin, dan data terkait user ini akan <span className="font-bold">ikut terhapus</span>. Tindakan ini tidak bisa dibatalkan.</p>
                </div>
                <div className="flex gap-2 p-4 border-t border-slate-100">
                  <button onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                  <button onClick={handleDelete} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 disabled:opacity-50">{saving ? "Menghapus..." : "Hapus Permanen"}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
