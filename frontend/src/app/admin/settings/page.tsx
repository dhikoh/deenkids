"use client";

import { useState, useEffect } from "react";
import { fetchAiToggle, updateAiToggle, fetchRewardSettings, updateRewardSettings, fetchLeaderboard } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Sparkles, Save, Trophy, Settings, Coins } from "lucide-react";

export default function SettingsPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Reward settings
  const [rewardSettings, setRewardSettings] = useState<Record<string, string>>({
    point_per_approved: "10",
    point_views_milestone: "5",
    point_likes_milestone: "3",
    point_shares_milestone: "3",
    point_rating_bonus: "5",
    point_to_rupiah: "1000",
    min_withdrawal_points: "50",
    max_submit_per_day: "5",
  });
  const [isSavingReward, setIsSavingReward] = useState(false);

  // Leaderboard
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      const [aiData, rewardData, lbData] = await Promise.all([
        fetchAiToggle(token),
        fetchRewardSettings(token),
        fetchLeaderboard(token),
      ]);
      setAiEnabled(aiData.aiEnabled);
      setRewardSettings({
        point_per_approved: String(rewardData.pointPerApproved || 10),
        point_views_milestone: String(rewardData.pointViewsMilestone || 5),
        point_likes_milestone: String(rewardData.pointLikesMilestone || 3),
        point_shares_milestone: String(rewardData.pointSharesMilestone || 3),
        point_rating_bonus: String(rewardData.pointRatingBonus || 5),
        point_to_rupiah: String(rewardData.pointToRupiah || 1000),
        min_withdrawal_points: String(rewardData.minWithdrawalPoints || 50),
        max_submit_per_day: String(rewardData.maxSubmitPerDay || 5),
      });
      setLeaderboard(lbData.data || []);
    } catch (error) {
      toast.error("Gagal memuat pengaturan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAi = async () => {
    setIsSaving(true);
    try {
      const token = Cookies.get("access_token"); if (!token) return;
      await updateAiToggle(aiEnabled, token);
      toast.success("Pengaturan AI berhasil disimpan");
    } catch { toast.error("Gagal menyimpan"); }
    finally { setIsSaving(false); }
  };

  const handleSaveReward = async () => {
    setIsSavingReward(true);
    try {
      const token = Cookies.get("access_token"); if (!token) return;
      await updateRewardSettings(rewardSettings, token);
      toast.success("Pengaturan reward berhasil disimpan");
    } catch { toast.error("Gagal menyimpan pengaturan reward"); }
    finally { setIsSavingReward(false); }
  };

  const updateReward = (key: string, value: string) => {
    setRewardSettings(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading) return <div className="p-8">Memuat pengaturan...</div>;

  const rewardFields = [
    { key: "point_per_approved", label: "Poin per konten disetujui", desc: "Poin yang diberikan saat konten dipublikasikan", icon: "📝" },
    { key: "point_views_milestone", label: "Bonus per 500 views", desc: "Bonus poin setiap konten mencapai kelipatan 500 views", icon: "👁️" },
    { key: "point_likes_milestone", label: "Bonus per 50 likes", desc: "Bonus poin setiap konten mencapai kelipatan 50 likes", icon: "👍" },
    { key: "point_shares_milestone", label: "Bonus per 100 shares", desc: "Bonus poin setiap konten mencapai kelipatan 100 shares", icon: "🔗" },
    { key: "point_rating_bonus", label: "Bonus rating bagus", desc: "Bonus saat konten mendapat rating ≥4.5 dari min 10 penilai", icon: "⭐" },
    { key: "point_to_rupiah", label: "Nilai 1 poin (Rp)", desc: "Konversi poin ke rupiah untuk withdrawal", icon: "💰" },
    { key: "min_withdrawal_points", label: "Minimal withdrawal (poin)", desc: "Jumlah poin minimum untuk request withdrawal", icon: "🏦" },
    { key: "max_submit_per_day", label: "Maks submit/hari", desc: "Batas maksimal konten yang bisa diajukan per hari", icon: "📊" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan Global</h1>
        <p className="text-slate-500">Konfigurasi sistem utama Adably.</p>
      </div>

      {/* AI Checker */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={20} /> Konfigurasi AI Checker
        </h2>
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="font-semibold text-slate-700">Status AI Checker (OpenAI)</p>
            <p className="text-sm text-slate-500">Jika aktif, AI akan mengecek dalil dan kesesuaian usia setiap konten yang dibuat.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />
            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
        </div>
        <button onClick={handleSaveAi} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70">
          <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>

      {/* Reward Settings */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
          <Coins className="text-amber-500" size={20} /> Pengaturan Reward & Poin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {rewardFields.map(f => (
            <div key={f.key} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <label className="block text-sm font-bold text-slate-700 mb-1">{f.icon} {f.label}</label>
              <p className="text-xs text-slate-400 mb-2">{f.desc}</p>
              <input type="number" value={rewardSettings[f.key]} onChange={e => updateReward(f.key, e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 font-bold text-lg" />
            </div>
          ))}
        </div>
        <button onClick={handleSaveReward} disabled={isSavingReward} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70">
          <Save size={18} /> {isSavingReward ? "Menyimpan..." : "Simpan Pengaturan Reward"}
        </button>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="text-amber-500" size={20} />
          <h2 className="text-lg font-bold text-slate-800">Leaderboard Author</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Nama</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Poin</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Published</th>
                <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Total Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaderboard.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Belum ada data author.</td></tr>
              ) : leaderboard.map((u, i) => (
                <tr key={u.id} className={`${i < 3 ? "bg-amber-50/50" : ""} hover:bg-slate-50`}>
                  <td className="px-4 py-3 font-extrabold text-sm">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-sm text-slate-800">{u.name}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{u.points}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{u.authorStats?.totalPublished || 0}</td>
                  <td className="px-4 py-3 text-right text-sm text-slate-600">{u.authorStats?.totalViews?.toLocaleString("id-ID") || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
