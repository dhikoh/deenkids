"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { fetchPodcastSettings, updatePodcastSettings } from "@/lib/api";
import toast from "react-hot-toast";
import { Headphones, Copy, ExternalLink, Save, RefreshCw, Rss, CheckCircle } from "lucide-react";

interface PodcastSettings {
  title: string;
  description: string;
  author: string;
  coverUrl: string | null;
  language: string;
  category: string;
  isActive: boolean;
  feedUrl?: string;
}

export default function PodcastSettingsPage() {
  const [settings, setSettings] = useState<PodcastSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = Cookies.get("token") || "";
      const data = await fetchPodcastSettings(token);
      setSettings(data);
    } catch {
      toast.error("Gagal memuat pengaturan podcast");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const token = Cookies.get("token") || "";
      const { feedUrl, ...data } = settings;
      await updatePodcastSettings(token, data);
      toast.success("Pengaturan podcast berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const copyFeedUrl = () => {
    if (settings?.feedUrl) {
      navigator.clipboard.writeText(settings.feedUrl);
      setCopied(true);
      toast.success("Feed URL disalin!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-lg w-64" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!settings) return <p className="text-center text-slate-500 mt-10">Gagal memuat data.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Headphones className="h-6 w-6 text-green-600" /> Podcast Settings
          </h1>
          <p className="text-slate-500 mt-1">Kelola RSS feed podcast untuk Spotify, Apple Podcasts, dll.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>

      {/* Feed URL Card */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-2xl border border-green-200">
        <div className="flex items-center gap-2 mb-3">
          <Rss className="h-5 w-5 text-green-600" />
          <span className="text-sm font-bold text-green-800">Feed URL (untuk Spotify)</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={settings.feedUrl || ""}
            className="flex-1 bg-white border border-green-200 rounded-xl p-3 text-sm text-slate-700 font-mono"
          />
          <button
            onClick={copyFeedUrl}
            className="p-3 bg-white border border-green-200 rounded-xl hover:bg-green-50 transition-all"
            title="Copy"
          >
            {copied ? <CheckCircle size={18} className="text-green-600" /> : <Copy size={18} className="text-slate-500" />}
          </button>
        </div>
        <div className="flex gap-3 mt-3">
          <a
            href={settings.feedUrl || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-700 hover:underline flex items-center gap-1"
          >
            <ExternalLink size={12} /> Preview Feed
          </a>
          <a
            href="https://podcasters.spotify.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-700 hover:underline flex items-center gap-1"
          >
            <ExternalLink size={12} /> Spotify for Podcasters
          </a>
        </div>
      </div>

      {/* Status Toggle */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Status Podcast</h3>
            <p className="text-sm text-slate-500">Feed hanya aktif jika toggle dinyalakan</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, isActive: !settings.isActive })}
            className={`relative w-12 h-6 rounded-full transition-all ${settings.isActive ? "bg-green-500" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.isActive ? "translate-x-6" : ""}`} />
          </button>
        </div>
      </div>

      {/* Podcast Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">📋 Informasi Podcast</h3>
        
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Judul Podcast</label>
          <input
            type="text"
            value={settings.title}
            onChange={e => setSettings({ ...settings, title: e.target.value })}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none"
            placeholder="Nama podcast Anda"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Deskripsi</label>
          <textarea
            value={settings.description}
            onChange={e => setSettings({ ...settings, description: e.target.value })}
            rows={3}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none resize-none"
            placeholder="Deskripsi podcast untuk ditampilkan di Spotify"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Author</label>
            <input
              type="text"
              value={settings.author}
              onChange={e => setSettings({ ...settings, author: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Bahasa</label>
            <select
              value={settings.language}
              onChange={e => setSettings({ ...settings, language: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 outline-none"
            >
              <option value="id">Indonesia</option>
              <option value="en">English</option>
              <option value="ms">Melayu</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
            <select
              value={settings.category}
              onChange={e => setSettings({ ...settings, category: e.target.value })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 outline-none"
            >
              <option value="Education">Education</option>
              <option value="Religion &amp; Spirituality">Religion &amp; Spirituality</option>
              <option value="Kids &amp; Family">Kids &amp; Family</option>
              <option value="Society &amp; Culture">Society &amp; Culture</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Cover Art URL</label>
            <input
              type="text"
              value={settings.coverUrl || ""}
              onChange={e => setSettings({ ...settings, coverUrl: e.target.value || null })}
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-green-400 focus:ring-1 focus:ring-green-400 outline-none"
              placeholder="https://... (min 3000x3000px)"
            />
          </div>
        </div>

        {settings.coverUrl && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <img src={settings.coverUrl} alt="Cover" className="w-16 h-16 rounded-lg object-cover" />
            <span className="text-xs text-slate-500">Preview cover art</span>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-5 rounded-2xl border border-slate-200">
        <h3 className="font-bold text-slate-800 mb-3">🚀 Cara Submit ke Spotify</h3>
        <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
          <li>Buka <a href="https://podcasters.spotify.com/" target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline font-medium">Spotify for Podcasters</a></li>
          <li>Login / Buat akun baru</li>
          <li>Pilih <strong>&quot;Add your podcast&quot;</strong> → <strong>&quot;I have a podcast with an RSS feed&quot;</strong></li>
          <li>Paste feed URL di atas</li>
          <li>Verify ownership → Submit</li>
          <li>Tunggu 1-3 hari untuk approval Spotify</li>
        </ol>
        <p className="text-xs text-slate-400 mt-3">💡 Setelah approved, setiap konten baru dengan audio akan otomatis muncul di Spotify.</p>
      </div>
    </div>
  );
}
