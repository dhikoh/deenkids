"use client";

import { useState, useEffect } from "react";
import { fetchUsersList, updateUserRole } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Users, Shield, Edit2, X } from "lucide-react";

const roleColors: Record<string, string> = {
  SUPERADMIN: "bg-purple-100 text-purple-700 border-purple-200",
  ADMIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  EDITOR: "bg-sky-100 text-sky-700 border-sky-200",
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editUser, setEditUser] = useState<any>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const loadUsers = async () => {
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      const data = await fetchUsersList(token);
      setUsers(data);
    } catch { toast.error("Gagal memuat daftar pengguna"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleRoleUpdate = async () => {
    if (!editUser || !selectedRole) return;
    const token = Cookies.get("access_token");
    try {
      await updateUserRole(editUser.id, selectedRole, token || "");
      toast.success(`Role ${editUser.name} diubah menjadi ${selectedRole}`);
      setEditUser(null);
      loadUsers();
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500">Memuat pengguna...</div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-slate-800">Manajemen User</h1><p className="text-slate-500">Kelola akun dan role pengguna platform.</p></div>

      {/* Role Change Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg text-slate-800">Ubah Role</h3>
              <button onClick={() => setEditUser(null)}><X size={20} className="text-slate-400" /></button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Mengubah role untuk <span className="font-bold text-slate-800">{editUser.name}</span></p>
            <div className="space-y-2 mb-6">
              {["EDITOR", "ADMIN", "SUPERADMIN"].map(role => (
                <button key={role} onClick={() => setSelectedRole(role)} className={`w-full p-3 rounded-xl border text-left font-bold text-sm transition-all ${selectedRole === role ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  <Shield size={16} className="inline mr-2" />{role}
                  {role === "EDITOR" && <span className="text-xs font-normal text-slate-400 ml-2">— Hanya menulis konten</span>}
                  {role === "ADMIN" && <span className="text-xs font-normal text-slate-400 ml-2">— Review + struktur</span>}
                  {role === "SUPERADMIN" && <span className="text-xs font-normal text-slate-400 ml-2">— Akses penuh</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditUser(null)} className="flex-1 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Batal</button>
              <button onClick={handleRoleUpdate} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700">Simpan</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Pengguna</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Role</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Konten</th>
              <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase">Bergabung</th>
              <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-emerald-700 font-bold uppercase text-sm">{u.name?.substring(0, 2)}</div>
                    <div><p className="font-bold text-slate-800 text-sm">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></div>
                  </div>
                </td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${roleColors[u.role]}`}>{u.role}</span></td>
                <td className="p-4 text-sm font-medium text-slate-600">{u._count?.contentItems ?? 0}</td>
                <td className="p-4 text-sm text-slate-500">{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                <td className="p-4 text-right">
                  <button onClick={() => { setEditUser(u); setSelectedRole(u.role); }} className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100" title="Ubah Role"><Edit2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
