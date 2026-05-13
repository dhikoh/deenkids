"use client";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { getSocialCaptionPreview, publishToSocial, fetchSocialAccounts, fetchSocialLogs } from "@/lib/api";
import { X, Instagram, Facebook, Send, Clock, AlertTriangle, CheckCircle, Video, Image, Youtube } from "lucide-react";

interface SocialPublishModalProps {
  contentId: string;
  contentTitle: string;
  onClose: () => void;
  onPublished?: () => void;
}

export default function SocialPublishModal({ contentId, contentTitle, onClose, onPublished }: SocialPublishModalProps) {
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(["INSTAGRAM", "FACEBOOK", "YOUTUBE", "TIKTOK"]);
  const [mode, setMode] = useState<"IMMEDIATE" | "SCHEDULED">("IMMEDIATE");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [previousPosts, setPreviousPosts] = useState<any[]>([]);
  const [results, setResults] = useState<any[] | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [hasDescription, setHasDescription] = useState(false);
  const [tagCount, setTagCount] = useState(0);

  const token = Cookies.get("_at") || "";

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        // Check if account is connected
        const accRes = await fetchSocialAccounts(token);
        const accounts = accRes.data || [];
        setConnected(accounts.length > 0 && accounts.some((a: any) => a.isActive));

        if (accounts.length > 0) {
          // Generate caption preview
          const captionRes = await getSocialCaptionPreview(contentId, token);
          setCaption(captionRes.caption || "");
          setImageUrl(captionRes.imageUrl || null);
          setHasAudio(!!captionRes.hasAudio);
          setHasDescription(!!captionRes.hasDescription);
          setTagCount(captionRes.tagCount || 0);

          // Check previous posts
          const logsRes = await fetchSocialLogs({ contentId }, token);
          setPreviousPosts((logsRes.data || []).filter((l: any) => l.status === "PUBLISHED"));
        }
      } catch {}
      setLoading(false);
    };
    init();
  }, [contentId, token]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handlePublish = async () => {
    if (platforms.length === 0) return;
    if (mode === "SCHEDULED" && !scheduledAt) return;

    setPublishing(true);
    try {
      const res = await publishToSocial({
        contentId,
        platforms,
        caption,
        mode,
        scheduledAt: mode === "SCHEDULED" ? scheduledAt : undefined,
      }, token);
      setResults(res.results || []);
      onPublished?.();
    } catch (err: any) {
      setResults([{ platform: "ERROR", status: "FAILED", error: err.message || "Gagal publish" }]);
    }
    setPublishing(false);
  };

  const charCount = caption.length;
  const charColor = charCount > 2200 ? "text-red-500" : charCount > 2000 ? "text-amber-500" : "text-slate-400";

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-8" onClick={(e) => e.stopPropagation()}>
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-sm text-slate-500 mt-3">Memuat preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-pink-500 to-indigo-500 text-white p-1.5 rounded-lg">
              <Send size={18} />
            </div>
            <h2 className="font-bold text-slate-800">Publish ke Sosial Media</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Not Connected */}
          {!connected ? (
            <div className="text-center py-6">
              <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3" />
              <p className="font-medium text-slate-700 mb-2">Akun belum terhubung</p>
              <p className="text-sm text-slate-500 mb-4">Hubungkan akun Facebook & Instagram terlebih dahulu.</p>
              <a href="/admin/social-settings" className="inline-block bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
                Buka Pengaturan Sosmed →
              </a>
            </div>
          ) : results ? (
            /* Results */
            <div className="space-y-3">
              <div className="text-center mb-4">
                <CheckCircle size={40} className="text-emerald-500 mx-auto mb-2" />
                <h3 className="font-bold text-slate-800">Hasil Publish</h3>
              </div>
              {results.map((r: any, i: number) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${r.status === "PUBLISHED" ? "bg-emerald-50" : r.status === "SCHEDULED" ? "bg-blue-50" : "bg-red-50"}`}>
                  {r.platform === "INSTAGRAM" ? <Instagram size={20} className="text-pink-500" /> : r.platform === "FACEBOOK" ? <Facebook size={20} className="text-blue-600" /> : r.platform === "YOUTUBE" ? <Youtube size={20} className="text-red-600" /> : <AlertTriangle size={20} className="text-red-500" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{r.platform}</p>
                    <p className="text-xs text-slate-500">{r.status === "PUBLISHED" ? "Berhasil dipublish!" : r.status === "SCHEDULED" ? "Dijadwalkan" : r.error || "Gagal"}</p>
                  </div>
                  {r.postUrl && <a href={r.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:underline">Lihat →</a>}
                </div>
              ))}
              <button onClick={onClose} className="w-full mt-4 bg-slate-100 text-slate-700 py-2.5 rounded-xl font-medium hover:bg-slate-200 transition-colors">Tutup</button>
            </div>
          ) : (
            /* Publish Form */
            <>
              {/* Image Preview */}
              {imageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-100 aspect-square max-h-48 flex items-center justify-center bg-slate-50">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold backdrop-blur-sm ${hasAudio ? 'bg-purple-500/90 text-white' : 'bg-slate-700/70 text-white'}`}>
                    {hasAudio ? <><Video size={12} /> Video (MP4)</> : <><Image size={12} /> Gambar</>}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4 text-center">
                  <AlertTriangle size={24} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-sm text-amber-700">Konten ini belum memiliki thumbnail. Upload thumbnail di Editor terlebih dahulu.</p>
                </div>
              )}

              {/* Previous posts warning */}
              {previousPosts.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">Konten ini sudah pernah di-publish ke {previousPosts.map((p: any) => p.platform).join(" & ")} pada {new Date(previousPosts[0].publishedAt).toLocaleDateString("id-ID")}.</p>
                </div>
              )}

              {/* Caption */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Caption</label>
                <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={8} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-indigo-500 focus:ring-indigo-500 resize-none" placeholder="Caption akan otomatis di-generate..." />
                <p className={`text-xs mt-1 text-right ${charColor}`}>{charCount} / 2200</p>
                {/* Description & Tag badges */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {hasDescription ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"><CheckCircle size={12} /> Deskripsi termasuk</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700"><AlertTriangle size={12} /> Tidak ada deskripsi</span>
                  )}
                  {tagCount > 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"><CheckCircle size={12} /> {tagCount} tag termasuk</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700"><AlertTriangle size={12} /> Belum ada tag</span>
                  )}
                  {hasAudio ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700"><Video size={12} /> Publish sebagai video</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-50 text-slate-500"><Image size={12} /> Publish sebagai gambar</span>
                  )}
                </div>
              </div>

              {/* Platform Selection */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Platform</label>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={() => togglePlatform("INSTAGRAM")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${platforms.includes("INSTAGRAM") ? "border-pink-500 bg-pink-50 text-pink-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    <Instagram size={20} /> Instagram
                  </button>
                  <button onClick={() => togglePlatform("FACEBOOK")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${platforms.includes("FACEBOOK") ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    <Facebook size={20} /> Facebook
                  </button>
                  <button onClick={() => togglePlatform("YOUTUBE")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${platforms.includes("YOUTUBE") ? "border-red-500 bg-red-50 text-red-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    <Youtube size={20} /> YouTube
                  </button>
                  <button onClick={() => togglePlatform("TIKTOK")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${platforms.includes("TIKTOK") ? "border-gray-800 bg-gray-100 text-gray-800" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    🎵 TikTok
                  </button>
                </div>
              </div>

              {/* Mode */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">Mode</label>
                <div className="flex gap-3">
                  <button onClick={() => setMode("IMMEDIATE")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${mode === "IMMEDIATE" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    <Send size={16} /> Langsung
                  </button>
                  <button onClick={() => setMode("SCHEDULED")} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-medium text-sm transition-all ${mode === "SCHEDULED" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-400 hover:border-slate-300"}`}>
                    <Clock size={16} /> Jadwalkan
                  </button>
                </div>
                {mode === "SCHEDULED" && (
                  <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full mt-3 border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 focus:ring-blue-500" />
                )}
              </div>

              {/* Submit */}
              <button onClick={handlePublish} disabled={publishing || platforms.length === 0 || !imageUrl || charCount > 2200} className="w-full bg-gradient-to-r from-pink-500 to-indigo-600 text-white py-3 rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {publishing ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Publishing...</>
                ) : mode === "SCHEDULED" ? (
                  <><Clock size={18} /> Jadwalkan</>
                ) : (
                  <><Send size={18} /> Publish Sekarang</>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
