"use client";
import { useState, useEffect } from "react";
import { fetchContentBatch } from "@/lib/api";
import Link from "next/link";
import { Bookmark, Trash2, BookOpen, Eye, Heart, Star } from "lucide-react";

const STORAGE_KEY = "adably_bookmarks";

function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function removeBookmark(id: string) {
  const current = getBookmarks().filter(x => x !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export default function TersimpanPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const ids = getBookmarks();
    if (ids.length === 0) { setLoading(false); return; }
    try {
      const res = await fetchContentBatch(ids);
      setItems(res.data || []);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleRemove = (id: string) => {
    removeBookmark(id);
    setItems(items.filter(i => i.id !== id));
  };

  const typeLabel = (t: string) => t === 'QNA' ? 'Tanya Jawab' : t === 'PEMBELAJARAN' ? 'Pembelajaran' : t === 'KISAH' ? 'Kisah' : 'Artikel';
  const typeColor = (t: string) => t === 'QNA' ? 'bg-amber-50 text-amber-600' : t === 'PEMBELAJARAN' ? 'bg-emerald-50 text-emerald-600' : t === 'KISAH' ? 'bg-orange-50 text-orange-600' : 'bg-sky-50 text-sky-600';

  const getUrl = (item: any) => {
    if (item.type === 'QNA') return `/qna/${item.slug}`;
    if (item.type === 'PEMBELAJARAN') return `/kurikulum/${item.slug}`;
    if (item.type === 'KISAH') return `/kisah/${item.node?.slug || 'kisah'}/${item.slug}`;
    return `/artikel/${item.slug}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 md:px-6 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-100 p-3 rounded-xl">
            <Bookmark className="text-emerald-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Konten Tersimpan</h1>
            <p className="text-sm text-slate-500">📱 Tersimpan di perangkat ini. Menghapus data browser akan menghapus daftar ini.</p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Memuat konten tersimpan...</div>
        ) : items.length === 0 ? (
          <div className="text-center p-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <Bookmark className="mx-auto mb-4 text-slate-300" size={48} />
            <h3 className="text-lg font-bold text-slate-800">Belum ada konten tersimpan</h3>
            <p className="text-slate-500 mt-1 mb-4">Klik ikon 🔖 pada konten untuk menyimpannya di sini.</p>
            <Link href="/" className="text-emerald-600 font-bold hover:underline">Jelajahi Konten →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-5">
                <div className="flex items-start justify-between gap-4">
                  <Link href={getUrl(item)} className="flex-1 group">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${typeColor(item.type)}`}>{typeLabel(item.type)}</span>
                      {(item.ageGroups || []).map((a: string) => <span key={a} className="text-[10px] font-bold px-2 py-0.5 bg-sky-50 text-sky-600 rounded">{a} thn</span>)}
                    </div>
                    <h3 className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
                    {item.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Eye size={12} /> {item.viewCount || 0}</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> {item.likeCount || 0}</span>
                      {item.avgRating > 0 && <span className="flex items-center gap-1"><Star size={12} /> {item.avgRating.toFixed(1)}</span>}
                    </div>
                  </Link>
                  <button onClick={() => handleRemove(item.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus dari tersimpan">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
