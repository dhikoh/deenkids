"use client";
import { useState, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { User, CreditCard, Lock, Globe, Save } from "lucide-react";
import { changePassword } from "@/lib/api";

import { API_BASE_URL } from "@/lib/api";
const authH = (t: string) => ({ "Content-Type": "application/json", Authorization: `Bearer ${t}` });
const apiFetch = async (url: string, opts: RequestInit = {}) => { const r = await fetch(url, { cache: "no-store", ...opts }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || "Error"); } return r.json(); };

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", bio: "", locale: "id" });
  const [bank, setBank] = useState({ bankName: "", bankAccount: "", bankHolder: "" });
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "" });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try {
      const r = await apiFetch(`${API_BASE_URL}/admin/profile`, { headers: authH(token) });
      setProfile(r.data);
      setForm({ name: r.data.name || "", phone: r.data.phone || "", bio: r.data.bio || "", locale: r.data.locale || "id" });
      setBank({ bankName: r.data.bankName || "", bankAccount: r.data.bankAccount || "", bankHolder: r.data.bankHolder || "" });
    } catch { toast.error("Gagal memuat profil"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { await apiFetch(`${API_BASE_URL}/admin/profile`, { method: "PUT", headers: authH(token), body: JSON.stringify(form) }); toast.success("Profil disimpan"); localStorage.setItem("locale", form.locale); } catch (e: any) { toast.error(e.message); }
  };
  const saveBank = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { await apiFetch(`${API_BASE_URL}/admin/profile/bank`, { method: "PUT", headers: authH(token), body: JSON.stringify(bank) }); toast.success("Data rekening disimpan"); } catch (e: any) { toast.error(e.message); }
  };
  const savePw = async () => {
    const token = Cookies.get("access_token"); if (!token) return;
    try { await changePassword(pw, token); toast.success("Password berhasil diubah"); setPw({ currentPassword: "", newPassword: "" }); } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Memuat...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-800">Profil Saya</h1>

      {/* Personal Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} /> Informasi Pribadi</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-semibold text-slate-700">Nama</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
          <div><label className="text-sm font-semibold text-slate-700">Nomor HP</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
        </div>
        <div><label className="text-sm font-semibold text-slate-700">Bio</label><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1 min-h-[80px]" /></div>
        <div><label className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Globe size={14} /> Bahasa</label>
          <select value={form.locale} onChange={e => setForm({ ...form, locale: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1">
            <option value="id">🇮🇩 Bahasa Indonesia</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>
        <button onClick={saveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"><Save size={16} /> Simpan Profil</button>
      </div>

      {/* Bank Info */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard size={18} /> Data Rekening (untuk Withdrawal)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="text-sm font-semibold text-slate-700">Nama Bank</label><input value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" placeholder="BSI" /></div>
          <div><label className="text-sm font-semibold text-slate-700">Nomor Rekening</label><input value={bank.bankAccount} onChange={e => setBank({ ...bank, bankAccount: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
          <div><label className="text-sm font-semibold text-slate-700">Atas Nama</label><input value={bank.bankHolder} onChange={e => setBank({ ...bank, bankHolder: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
        </div>
        <button onClick={saveBank} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"><Save size={16} /> Simpan Rekening</button>
      </div>

      {/* Password */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Lock size={18} /> Ubah Password</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-sm font-semibold text-slate-700">Password Saat Ini</label><input type="password" value={pw.currentPassword} onChange={e => setPw({ ...pw, currentPassword: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
          <div><label className="text-sm font-semibold text-slate-700">Password Baru</label><input type="password" value={pw.newPassword} onChange={e => setPw({ ...pw, newPassword: e.target.value })} className="w-full border border-slate-300 rounded-lg p-2.5 mt-1" /></div>
        </div>
        <button onClick={savePw} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-6 rounded-xl flex items-center gap-2"><Lock size={16} /> Ubah Password</button>
      </div>

      {/* Info */}
      <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-500">
        <p>Email: <span className="font-bold">{profile?.email}</span> • Role: <span className="font-bold">{profile?.role}</span> • Poin: <span className="font-bold text-emerald-600">{profile?.points}</span></p>
      </div>
    </div>
  );
}
