"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { getSocialAuthUrl, connectSocialAccount, fetchSocialAccounts, disconnectSocialAccount, updateSocialDefaults, fetchSocialLogs, retrySocialPublish, cancelSocialScheduled, fetchSocialCronSettings, updateSocialCronSettings, getYouTubeAuthUrl, connectYouTubeAccount, getTikTokAuthUrl, connectTikTokAccount } from "@/lib/api";
import { Share2, Link2, Unlink, Instagram, Facebook, RefreshCw, X, CheckCircle, Clock, AlertTriangle, ExternalLink, Settings, Zap, ShieldCheck, Youtube } from "lucide-react";

export default function SocialSettingsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsMeta, setLogsMeta] = useState<any>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [editingDefaults, setEditingDefaults] = useState<string | null>(null);
  const [hashtagInput, setHashtagInput] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Cron settings state
  const [cronSettings, setCronSettings] = useState({
    publishEnabled: true, publishInterval: 1, publishLastRun: null as string | null,
    validateEnabled: true, validateInterval: 24, validateLastRun: null as string | null,
  });
  const [cronLoading, setCronLoading] = useState(false);
  const [cronSaving, setCronSaving] = useState(false);

  const token = Cookies.get("_at") || "";

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadAccounts = async () => {
    try {
      const res = await fetchSocialAccounts(token);
      setAccounts(res.data || []);
    } catch { setAccounts([]); }
  };

  const loadLogs = async (page = 1) => {
    try {
      const res = await fetchSocialLogs({ page }, token);
      setLogs(res.data || []);
      setLogsMeta(res.meta || { total: 0, page: 1, totalPages: 1 });
    } catch { setLogs([]); }
  };

  const loadCronSettings = async () => {
    setCronLoading(true);
    try {
      const res = await fetchSocialCronSettings(token);
      setCronSettings({
        publishEnabled: res.publishEnabled ?? true,
        publishInterval: res.publishInterval ?? 1,
        publishLastRun: res.publishLastRun || null,
        validateEnabled: res.validateEnabled ?? true,
        validateInterval: res.validateInterval ?? 24,
        validateLastRun: res.validateLastRun || null,
      });
    } catch {}
    setCronLoading(false);
  };

  const handleSaveCronSettings = async () => {
    setCronSaving(true);
    try {
      await updateSocialCronSettings({
        publishEnabled: cronSettings.publishEnabled,
        publishInterval: cronSettings.publishInterval,
        validateEnabled: cronSettings.validateEnabled,
        validateInterval: cronSettings.validateInterval,
      }, token);
      showToast("success", "Pengaturan otomasi berhasil disimpan");
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan pengaturan");
    }
    setCronSaving(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadAccounts(), loadLogs(), loadCronSettings()]);
      setLoading(false);

      // Handle OAuth callback
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      if (error) {
        showToast("error", "Koneksi Facebook dibatalkan.");
        window.history.replaceState({}, "", "/admin/social-settings");
      } else if (code) {
        setConnecting(true);
        try {
          await connectSocialAccount(code, token);
          showToast("success", "Akun sosial media berhasil terhubung! 🎉");
          await loadAccounts();
        } catch (err: any) {
          showToast("error", err.message || "Gagal menghubungkan akun.");
        }
        setConnecting(false);
        window.history.replaceState({}, "", "/admin/social-settings");
      }

      // Handle YouTube OAuth callback
      const ytCode = params.get("yt_code");
      if (ytCode) {
        setConnecting(true);
        try {
          await connectYouTubeAccount(ytCode, token);
          showToast("success", "YouTube channel berhasil terhubung! 🎉");
          await loadAccounts();
        } catch (err: any) {
          showToast("error", err.message || "Gagal menghubungkan YouTube.");
        }
        setConnecting(false);
        window.history.replaceState({}, "", "/admin/social-settings");
      }

      // Handle TikTok OAuth callback
      const ttCode = params.get("tt_code");
      if (ttCode) {
        setConnecting(true);
        try {
          await connectTikTokAccount(ttCode, token);
          showToast("success", "TikTok berhasil terhubung! 🎉");
          await loadAccounts();
        } catch (err: any) {
          showToast("error", err.message || "Gagal menghubungkan TikTok.");
        }
        setConnecting(false);
        window.history.replaceState({}, "", "/admin/social-settings");
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    try {
      const res = await getSocialAuthUrl(token);
      window.location.href = res.url;
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat URL koneksi.");
    }
  };

  const handleConnectYouTube = async () => {
    try {
      const res = await getYouTubeAuthUrl(token);
      window.location.href = res.url;
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat URL koneksi YouTube.");
    }
  };

  const handleConnectTikTok = async () => {
    try {
      const res = await getTikTokAuthUrl(token);
      window.location.href = res.url;
    } catch (err: any) {
      showToast("error", err.message || "Gagal membuat URL koneksi TikTok.");
    }
  };

  const handleDisconnect = async (accountId: string) => {
    if (!confirm("Yakin ingin memutuskan koneksi? Semua post terjadwal akan dibatalkan.")) return;
    try {
      await disconnectSocialAccount(accountId, token);
      showToast("success", "Koneksi diputus.");
      await loadAccounts();
      await loadLogs();
    } catch (err: any) {
      showToast("error", err.message || "Gagal memutus koneksi.");
    }
  };

  const handleSaveDefaults = async (accountId: string) => {
    try {
      await updateSocialDefaults(accountId, { defaultHashtags: hashtagInput }, token);
      showToast("success", "Hashtag default disimpan.");
      setEditingDefaults(null);
      await loadAccounts();
    } catch (err: any) {
      showToast("error", err.message || "Gagal menyimpan.");
    }
  };

  const handleRetry = async (logId: string) => {
    try {
      await retrySocialPublish(logId, token);
      showToast("success", "Publish ulang berhasil!");
      await loadLogs(logsMeta.page);
    } catch (err: any) {
      showToast("error", err.message || "Retry gagal.");
    }
  };

  const handleCancel = async (logId: string) => {
    try {
      await cancelSocialScheduled(logId, token);
      showToast("success", "Jadwal dibatalkan.");
      await loadLogs(logsMeta.page);
    } catch (err: any) {
      showToast("error", err.message || "Gagal membatalkan.");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { color: string; icon: any; label: string }> = {
      PUBLISHED: { color: "bg-emerald-100 text-emerald-700", icon: <CheckCircle size={14} />, label: "Published" },
      SCHEDULED: { color: "bg-blue-100 text-blue-700", icon: <Clock size={14} />, label: "Scheduled" },
      FAILED: { color: "bg-red-100 text-red-700", icon: <AlertTriangle size={14} />, label: "Failed" },
      CANCELLED: { color: "bg-slate-100 text-slate-500", icon: <X size={14} />, label: "Cancelled" },
      PUBLISHING: { color: "bg-amber-100 text-amber-700", icon: <RefreshCw size={14} className="animate-spin" />, label: "Publishing" },
    };
    const s = map[status] || map.FAILED;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.icon} {s.label}</span>;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-2 ${toast.type === "success" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-2.5 rounded-xl shadow-lg">
          <Share2 size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pengaturan Sosial Media</h1>
          <p className="text-sm text-slate-500">Hubungkan dan kelola akun Instagram & Facebook</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Link2 size={20} /> Status Koneksi</h2>
        
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Share2 size={28} className="text-slate-400" />
            </div>
            <p className="text-slate-500 mb-4">Belum ada akun sosial media yang terhubung</p>
            <button onClick={handleConnect} disabled={connecting} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50">
              {connecting ? "Menghubungkan..." : "🔗 Hubungkan Facebook & Instagram"}
            </button>
            <button onClick={handleConnectYouTube} disabled={connecting} className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-red-500/25 transition-all disabled:opacity-50 mt-3">
              {connecting ? "Menghubungkan..." : "▶️ Hubungkan YouTube"}
            </button>
            <button onClick={handleConnectTikTok} disabled={connecting} className="bg-gradient-to-r from-gray-800 to-black text-white px-6 py-2.5 rounded-xl font-medium hover:shadow-lg hover:shadow-gray-500/25 transition-all disabled:opacity-50 mt-3">
              {connecting ? "Menghubungkan..." : "🎵 Hubungkan TikTok"}
            </button>
          </div>
        ) : (
          <>
          <div className="space-y-4">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100">
                {acc.profilePictureUrl && (
                  <img src={acc.profilePictureUrl} alt="" className="w-12 h-12 rounded-full border-2 border-white shadow" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {acc.platform === 'YOUTUBE' ? <Youtube size={16} className="text-red-600" /> : acc.platform === 'TIKTOK' ? <span className="text-sm">🎵</span> : <Facebook size={16} className="text-blue-600" />}
                    <span className="font-semibold text-slate-800">{acc.pageName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">{acc.platform === 'YOUTUBE' ? 'YouTube' : acc.platform === 'TIKTOK' ? 'TikTok' : 'Meta'}</span>
                    {acc.isActive ? (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">✅ Aktif</span>
                    ) : (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">⚠️ Token Expired</span>
                    )}
                  </div>
                  {acc.igUsername && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500">
                      <Instagram size={14} /> @{acc.igUsername}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingDefaults(acc.id); setHashtagInput(acc.defaultHashtags || ""); }} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors" title="Edit defaults">
                    <Settings size={18} />
                  </button>
                  <button onClick={() => handleDisconnect(acc.id)} className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="Putus koneksi">
                    <Unlink size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Add more accounts */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
            <button onClick={handleConnect} disabled={connecting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50">
              <Facebook size={16} /> + Meta
            </button>
            <button onClick={handleConnectYouTube} disabled={connecting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50">
              <Youtube size={16} /> + YouTube
            </button>
            <button onClick={handleConnectTikTok} disabled={connecting} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
              🎵 + TikTok
            </button>
          </div>
          </>
        )}
      </div>

      {/* Default Hashtags Editor */}
      {editingDefaults && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Default Hashtag</h2>
          <textarea value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="#adably #edukasiislami #parentingislami" />
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setEditingDefaults(null)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
            <button onClick={() => handleSaveDefaults(editingDefaults)} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
          </div>
        </div>
      )}

      {/* Pengaturan Otomasi */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">⚙️ Pengaturan Otomasi</h2>
        <p className="text-sm text-slate-400 mb-5">Atur jadwal cron jobs untuk publish otomatis dan validasi token</p>

        <div className="space-y-5">
          {/* Scheduled Publish Cron */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Zap size={20} className="text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-slate-700">Jadwal Publish Otomatis</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={cronSettings.publishEnabled} onChange={(e) => setCronSettings(prev => ({ ...prev, publishEnabled: e.target.checked }))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <p className="text-xs text-slate-400 mb-3">Cek dan publish post yang dijadwalkan secara otomatis</p>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500">Interval:</label>
                <select value={cronSettings.publishInterval} onChange={(e) => setCronSettings(prev => ({ ...prev, publishInterval: parseInt(e.target.value) }))} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-indigo-500 focus:ring-indigo-500">
                  <option value={1}>Setiap 1 menit</option>
                  <option value={2}>Setiap 2 menit</option>
                  <option value={5}>Setiap 5 menit</option>
                  <option value={10}>Setiap 10 menit</option>
                  <option value={15}>Setiap 15 menit</option>
                  <option value={30}>Setiap 30 menit</option>
                </select>
              </div>
              {cronSettings.publishLastRun && (
                <p className="text-xs text-slate-400 mt-2">🕐 Terakhir jalan: {new Date(cronSettings.publishLastRun).toLocaleString("id-ID")}</p>
              )}
            </div>
          </div>

          {/* Token Validation Cron */}
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-slate-700">Validasi Token Sosial Media</h3>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={cronSettings.validateEnabled} onChange={(e) => setCronSettings(prev => ({ ...prev, validateEnabled: e.target.checked }))} className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
              <p className="text-xs text-slate-400 mb-3">Validasi apakah token Facebook/Instagram masih berlaku</p>
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-500">Interval:</label>
                <select value={cronSettings.validateInterval} onChange={(e) => setCronSettings(prev => ({ ...prev, validateInterval: parseInt(e.target.value) }))} className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:border-indigo-500 focus:ring-indigo-500">
                  <option value={6}>Setiap 6 jam</option>
                  <option value={12}>Setiap 12 jam</option>
                  <option value={24}>Setiap 24 jam</option>
                  <option value={48}>Setiap 48 jam</option>
                </select>
              </div>
              {cronSettings.validateLastRun && (
                <p className="text-xs text-slate-400 mt-2">🕐 Terakhir jalan: {new Date(cronSettings.validateLastRun).toLocaleString("id-ID")}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={handleSaveCronSettings} disabled={cronSaving} className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {cronSaving ? "Menyimpan..." : "Simpan Pengaturan"}
          </button>
        </div>
      </div>

      {/* Publish History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">📋 Riwayat Publish</h2>
        {logs.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Belum ada riwayat publish</p>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex-shrink-0">
                  {log.platform === "INSTAGRAM" ? <Instagram size={20} className="text-pink-500" /> : log.platform === "YOUTUBE" ? <Youtube size={20} className="text-red-600" /> : <Facebook size={20} className="text-blue-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{log.content?.title || "—"}</p>
                  <p className="text-xs text-slate-400">
                    {log.publishedAt ? new Date(log.publishedAt).toLocaleString("id-ID") : log.scheduledAt ? `Dijadwalkan: ${new Date(log.scheduledAt).toLocaleString("id-ID")}` : "—"}
                  </p>
                </div>
                {statusBadge(log.status)}
                <div className="flex gap-1.5">
                  {log.postUrl && (
                    <a href={log.postUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors">
                      <ExternalLink size={16} />
                    </a>
                  )}
                  {log.status === "FAILED" && (
                    <button onClick={() => handleRetry(log.id)} className="p-1.5 rounded-lg hover:bg-white text-amber-500 hover:text-amber-600 transition-colors" title="Retry">
                      <RefreshCw size={16} />
                    </button>
                  )}
                  {log.status === "SCHEDULED" && (
                    <button onClick={() => handleCancel(log.id)} className="p-1.5 rounded-lg hover:bg-white text-red-400 hover:text-red-600 transition-colors" title="Batalkan">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {logsMeta.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: logsMeta.totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => loadLogs(p)} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === logsMeta.page ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
