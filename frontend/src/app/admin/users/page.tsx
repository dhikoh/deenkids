"use client";

import { useState, useEffect } from "react";
import { fetchUsersList } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Users, Shield, User } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = Cookies.get("token");
      if (!token) return;
      const data = await fetchUsersList(token);
      setUsers(data);
    } catch (error) {
      toast.error("Gagal memuat daftar pengguna");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="p-8">Memuat pengguna...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
        <p className="text-slate-500">Kelola akses Editor, Admin, dan SuperAdmin.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-600">
              <th className="px-6 py-4">Nama</th>
              <th className="px-6 py-4">Email</th>
              <th className="px-6 py-4">Peran (Role)</th>
              <th className="px-6 py-4">Bergabung</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                    <User size={16} />
                  </div>
                  {u.name}
                </td>
                <td className="px-6 py-4 text-slate-600">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    u.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'ADMIN' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {u.role === 'SUPERADMIN' && <Shield size={12} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {new Date(u.createdAt).toLocaleDateString('id-ID')}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">Tidak ada data pengguna</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
