"use client";

import { useState, useEffect } from "react";
import {
  fetchAiToggle, updateAiToggle, fetchRewardSettings, updateRewardSettings,
  fetchLeaderboard, fetchApiSettings, updateApiSettings,
} from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { Sparkles, Save, Trophy, Coins, Key, Eye, EyeOff, ChevronDown } from "lucide-react";

type Tab = "general" | "api";

const TTS_PROVIDERS = [
  { value: "elevenlabs", label: "ElevenLabs", defaultModel: "eleven_multilingual_v2", voiceHelp: "Salin Voice ID dari dashboard ElevenLabs" },
  { value: "openai", label: "OpenAI TTS", defaultModel: "tts-1", voiceHelp: "Contoh: alloy, echo, fable, onyx, nova, shimmer" },
  { value: "google", label: "Google Text-to-Speech", defaultModel: "", voiceHelp: "Kode bahasa: id-ID, en-US, ar-XA, dll." },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("general");

  // ── General ──
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rewardSettings, setRewardSettings] = useState<Record<string, string>>({
    point_per_approved: "10", point_views_milestone: "5", point_likes_milestone: "3",
    point_shares_milestone: "3", point_rating_bonus: "5", point_to_rupiah: "1000",
    min_withdrawal_points: "50", max_submit_per_day: "5",
  });
  const [isSavingReward, setIsSavingReward] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // ── API Settings ──
  const [ttsProvider, setTtsProvider] = useState("elevenlabs");
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [ttsHasKey, setTtsHasKey] = useState(false);
  const [ttsVoiceId, setTtsVoiceId] = useState("");
  const [ttsModel, setTtsModel] = useState("eleven_multilingual_v2");
  const [ttsLanguage, setTtsLanguage] = useState("id");
  const [ttsStability, setTtsStability] = useState("0.5");
  const [ttsSimilarity, setTtsSimilarity] = useState("0.75");
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiHasKey, setAiHasKey] = useState(false);
  const [showTtsKey, setShowTtsKey] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);
  const [isSavingApi, setIsSavingApi] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const token = Cookies.get("_at");
      if (!token) return;
      const [aiData, rewardData, lbData, apiData] = await Promise.all([
        fetchAiToggle(token),
        fetchRewardSettings(token),
        fetchLeaderboard(token),
        fetchApiSettings(token).catch(() => null),
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

      if (apiData) {
        const { tts, ai } = apiData;
        setTtsProvider(tts.provider || "elevenlabs");
        setTtsHasKey(tts.hasApiKey || false);
        setTtsVoiceId(tts.voiceId || "");
        setTtsModel(tts.model || "eleven_multilingual_v2");
        setTtsLanguage(tts.language || "id");
        setTtsStability(tts.stability || "0.5");
        setTtsSimilarity(tts.similarityBoost || "0.75");
        setAiProvider(ai.provider || "openai");
        setAiHasKey(ai.hasApiKey || false);
      }
    } catch {
      toast.error("Gagal memuat pengaturan");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAi = async () => {
    setIsSaving(true);
    try {
      const token = Cookies.get("_at"); if (!token) return;
      await updateAiToggle(aiEnabled, token);
      toast.success("Pengaturan AI berhasil disimpan");
    } catch { toast.error("Gagal menyimpan"); }
    finally { setIsSaving(false); }
  };

  const handleSaveReward = async () => {
    setIsSavingReward(true);
    try {
      const token = Cookies.get("_at"); if (!token) return;
      await updateRewardSettings(rewardSettings, token);
      toast.success("Pengaturan reward berhasil disimpan");
    } catch { toast.error("Gagal menyimpan pengaturan reward"); }
    finally { setIsSavingReward(false); }
  };

  const handleSaveApiSettings = async () => {
    setIsSavingApi(true);
    try {
      const token = Cookies.get("_at"); if (!token) return;
      const settings: { key: string; value: string; group: string }[] = [
        { key: "tts_provider", value: ttsProvider, group: "tts" },
        { key: "tts_voice_id", value: ttsVoiceId, group: "tts" },
        { key: "tts_model", value: ttsModel, group: "tts" },
        { key: "tts_language", value: ttsLanguage, group: "tts" },
        { key: "tts_stability", value: ttsStability, group: "tts" },
        { key: "tts_similarity", value: ttsSimilarity, group: "tts" },
        { key: "ai_provider", value: aiProvider, group: "ai" },
      ];
      // Only send API keys if user typed a new one (not the masked placeholder)
      if (ttsApiKey && ttsApiKey !== "••••••••") settings.push({ key: "tts_api_key", value: ttsApiKey, group: "tts" });
      if (aiApiKey && aiApiKey !== "••••••••") settings.push({ key: "ai_api_key", value: aiApiKey, group: "ai" });
      await updateApiSettings(settings, token);
      toast.success("Pengaturan API berhasil disimpan");
      setTtsApiKey(""); setAiApiKey("");
      await loadSettings();
    } catch (err: any) { toast.error(err.message || "Gagal menyimpan pengaturan API"); }
    finally { setIsSavingApi(false); }
  };

  const currentTtsProvider = TTS_PROVIDERS.find(p => p.value === ttsProvider) || TTS_PROVIDERS[0];

  const updateReward = (key: string, value: string) => setRewardSettings(prev => ({ ...prev, [key]: value }));

  if (isLoading) return <div className="p-8 text-slate-500">Memuat pengaturan...</div>;

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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "general", label: "⚙️ Umum" },
          { key: "api", label: "🔑 Pengaturan API" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as Tab)}
            className={`px-5 py-2.5 text-sm font-bold rounded-t-xl border border-b-0 transition-colors ${
              tab === t.key
                ? "bg-white border-slate-200 text-emerald-700"
                : "bg-slate-50 border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── TAB UMUM ─── */}
      {tab === "general" && (
        <>
          {/* AI Checker */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} /> Konfigurasi AI Checker
            </h2>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-semibold text-slate-700">Status AI Checker (OpenAI)</p>
                <p className="text-sm text-slate-500">Jika aktif, AI akan mengecek dalil dan kesesuaian usia setiap konten.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={aiEnabled} onChange={e => setAiEnabled(e.target.checked)} />
                <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
            <button onClick={handleSaveAi} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold transition-colors flex items-center gap-2 disabled:opacity-70">
              <Save size={18} /> {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>

          {/* Reward Settings */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
              <Coins className="text-amber-500" size={20} /> Pengaturan Reward &amp; Poin
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
                      <td className="px-4 py-3"><p className="font-bold text-sm text-slate-800">{u.name}</p><p className="text-[10px] text-slate-400">{u.email}</p></td>
                      <td className="px-4 py-3 text-right font-extrabold text-emerald-600">{u.points}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{u.authorStats?.totalPublished || 0}</td>
                      <td className="px-4 py-3 text-right text-sm text-slate-600">{u.authorStats?.totalViews?.toLocaleString("id-ID") || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ─── TAB API SETTINGS ─── */}
      {tab === "api" && (
        <div className="space-y-6">
          {/* TTS Config */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              🎙️ Text-to-Speech (TTS)
            </h2>
            <p className="text-sm text-slate-500 mb-6">Konfigurasi provider TTS yang digunakan untuk generate narasi audio konten (SuperAdmin only).</p>

            {/* Provider Select */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Provider TTS</label>
              <div className="relative">
                <select
                  value={ttsProvider}
                  onChange={e => {
                    setTtsProvider(e.target.value);
                    const p = TTS_PROVIDERS.find(p => p.value === e.target.value);
                    if (p?.defaultModel) setTtsModel(p.defaultModel);
                  }}
                  className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-sm font-semibold appearance-none focus:border-emerald-500 focus:outline-none"
                >
                  {TTS_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Key size={14} /> API Key {ttsHasKey && <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Tersimpan</span>}
              </label>
              <div className="relative">
                <input
                  type={showTtsKey ? "text" : "password"}
                  value={ttsApiKey}
                  onChange={e => setTtsApiKey(e.target.value)}
                  placeholder={ttsHasKey ? "Ketik untuk mengganti API key..." : "Masukkan API key..."}
                  className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button type="button" onClick={() => setShowTtsKey(!showTtsKey)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  {showTtsKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">API key tidak akan ditampilkan kembali setelah disimpan.</p>
            </div>

            {/* Voice ID */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">
                {ttsProvider === "google" ? "Kode Bahasa" : "Voice ID"}
              </label>
              <input
                type="text"
                value={ttsProvider === "google" ? ttsLanguage : ttsVoiceId}
                onChange={e => ttsProvider === "google" ? setTtsLanguage(e.target.value) : setTtsVoiceId(e.target.value)}
                placeholder={currentTtsProvider.voiceHelp}
                className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:border-emerald-500 focus:outline-none"
              />
              <p className="text-xs text-slate-400 mt-1">{currentTtsProvider.voiceHelp}</p>
            </div>

            {/* Model */}
            {ttsProvider !== "google" && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-1">Model</label>
                <input
                  type="text"
                  value={ttsModel}
                  onChange={e => setTtsModel(e.target.value)}
                  placeholder={currentTtsProvider.defaultModel}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
            )}

            {/* Stability + Similarity (ElevenLabs only) */}
            {ttsProvider === "elevenlabs" && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Stability ({ttsStability})</label>
                  <input type="range" min="0" max="1" step="0.05" value={ttsStability} onChange={e => setTtsStability(e.target.value)} className="w-full accent-emerald-600" />
                  <p className="text-xs text-slate-400">0 = lebih ekspresif, 1 = lebih stabil</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Similarity ({ttsSimilarity})</label>
                  <input type="range" min="0" max="1" step="0.05" value={ttsSimilarity} onChange={e => setTtsSimilarity(e.target.value)} className="w-full accent-emerald-600" />
                  <p className="text-xs text-slate-400">0 = bebas, 1 = mirip suara asli</p>
                </div>
              </div>
            )}
          </div>

          {/* AI Checker Config */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} /> AI Checker
            </h2>
            <p className="text-sm text-slate-500 mb-6">Konfigurasi provider AI untuk pengecekan konten otomatis.</p>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">Provider AI Checker</label>
              <div className="relative">
                <select value={aiProvider} onChange={e => setAiProvider(e.target.value)} className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-sm font-semibold appearance-none focus:border-emerald-500 focus:outline-none">
                  <option value="openai">OpenAI (GPT-4o / GPT-3.5)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
                <Key size={14} /> API Key {aiHasKey && <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Tersimpan</span>}
              </label>
              <div className="relative">
                <input
                  type={showAiKey ? "text" : "password"}
                  value={aiApiKey}
                  onChange={e => setAiApiKey(e.target.value)}
                  placeholder={aiHasKey ? "Ketik untuk mengganti API key..." : "Masukkan API key..."}
                  className="w-full border border-slate-300 rounded-xl p-3 pr-10 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
                <button type="button" onClick={() => setShowAiKey(!showAiKey)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  {showAiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSaveApiSettings}
            disabled={isSavingApi}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg shadow-emerald-500/20"
          >
            <Save size={18} /> {isSavingApi ? "Menyimpan..." : "Simpan Semua Pengaturan API"}
          </button>
        </div>
      )}
    </div>
  );
}
