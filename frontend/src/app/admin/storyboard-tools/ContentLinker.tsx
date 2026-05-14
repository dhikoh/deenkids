"use client";
import { useState, useEffect } from "react";
import { Link2, Unlink, Search, Youtube, ExternalLink, CheckCircle } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { getStoryboardContentList, linkStoryboardToContent, unlinkStoryboardFromContent } from "@/lib/api";

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  storyboardVideoUrl: string | null;
  storyboardMp4Url: string | null;
}

interface Props {
  sessionId: string | null;
}

export default function ContentLinker({ sessionId }: Props) {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedContent, setSelectedContent] = useState<string>("");

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("_at") || "";
      const data = await getStoryboardContentList(token);
      setContents(data);
    } catch {
      toast.error("Gagal memuat daftar konten");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!selectedContent || !youtubeUrl) {
      toast.error("Pilih konten dan masukkan YouTube URL");
      return;
    }
    setLinkingId(selectedContent);
    try {
      const token = Cookies.get("_at") || "";
      await linkStoryboardToContent(token, selectedContent, youtubeUrl);
      toast.success("Video berhasil di-link ke konten!");
      setYoutubeUrl("");
      setSelectedContent("");
      loadContents();
    } catch (err: any) {
      toast.error(err.message || "Gagal link video");
    } finally {
      setLinkingId(null);
    }
  };

  const handleUnlink = async (contentId: string) => {
    if (!confirm("Hapus link video dari konten ini?")) return;
    setLinkingId(contentId);
    try {
      const token = Cookies.get("_at") || "";
      await unlinkStoryboardFromContent(token, contentId);
      toast.success("Link video dihapus");
      loadContents();
    } catch (err: any) {
      toast.error(err.message || "Gagal unlink");
    } finally {
      setLinkingId(null);
    }
  };

  const filtered = contents.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );
  const linked = filtered.filter(c => c.storyboardVideoUrl);
  const unlinked = filtered.filter(c => !c.storyboardVideoUrl);

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
        <Link2 size={14} className="text-violet-500" /> Link ke Konten
      </h3>

      {/* Link Form */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-[10px] font-semibold text-violet-600 mb-1">
            <Youtube size={10} className="inline mr-0.5" /> YouTube URL
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={e => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full text-xs border border-violet-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-violet-600 mb-1">Pilih Konten</label>
          <select
            value={selectedContent}
            onChange={e => setSelectedContent(e.target.value)}
            className="w-full text-xs border border-violet-200 rounded-lg px-2.5 py-2 bg-white focus:border-violet-400 outline-none"
          >
            <option value="">-- Pilih konten --</option>
            {unlinked.map(c => (
              <option key={c.id} value={c.id}>[{c.type}] {c.title}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleLink}
          disabled={!selectedContent || !youtubeUrl || !!linkingId}
          className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Link2 size={12} /> Link Video
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari konten..."
          className="w-full text-xs border border-slate-200 rounded-lg pl-8 pr-3 py-2 bg-white focus:border-violet-400 outline-none"
        />
      </div>

      {/* Linked list */}
      {linked.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">✅ Sudah di-link ({linked.length})</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {linked.map(c => (
              <div key={c.id} className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle size={12} className="text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-700 truncate">{c.title}</p>
                  <p className="text-[9px] text-emerald-600 truncate">{c.storyboardVideoUrl}</p>
                </div>
                <button
                  onClick={() => handleUnlink(c.id)}
                  disabled={linkingId === c.id}
                  className="p-1 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-500 transition-all"
                  title="Hapus link"
                >
                  <Unlink size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-xs text-slate-400 text-center">Memuat...</p>}
    </div>
  );
}
