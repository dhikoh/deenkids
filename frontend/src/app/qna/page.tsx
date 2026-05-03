"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, Search, ThumbsUp, Star, Eye, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const AGE_OPTIONS = ["", "3-5", "5-7", "7-10", "10-13"];

export default function QnaPage() {
  const [items, setItems] = useState<any[]>([]);
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "20", type: "QNA" });
    if (search) params.append("search", search);
    if (ageFilter) params.append("age", ageFilter);
    fetch(`${API_BASE_URL}/content/list?${params}`)
      .then((res) => res.json())
      .then((json) => setItems(json.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [sort, search, ageFilter]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-4">
          <MessageCircle className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Bank Pertanyaan Anak</h1>
        <p className="text-slate-500 max-w-xl font-medium">
          Temukan jawaban cerdas, ringkas, dan syar'i — sesuai Alquran dan Hadist.
        </p>
      </div>

      {/* Sort / Search / Age Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 mb-8">
        <div className="relative flex-grow flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari pertanyaan..." className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-slate-700 text-sm font-medium" />
        </div>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-bold cursor-pointer border-none rounded-xl hover:bg-slate-50 transition-colors">
          <option value="">Semua Usia</option>
          {AGE_OPTIONS.filter(a => a).map(a => <option key={a} value={a}>{a} Tahun</option>)}
        </select>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-bold cursor-pointer border-none rounded-xl hover:bg-slate-50 transition-colors"
        >
          <option value="newest">Terbaru</option>
          <option value="most_read">Paling Banyak Dibaca</option>
          <option value="top_rated">Rating Tertinggi</option>
          <option value="most_liked">Paling Disukai</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      )}

      {/* QnA Grid */}
      {!loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <Link
              href={`/qna/${item.slug}`}
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full overflow-hidden"
            >
              {item.thumbnailUrl && (
                <div className="w-full h-40 overflow-hidden">
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow justify-between">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-[10px] font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md uppercase tracking-wider">{item.type}</span>
                {(item.ageGroups || []).map((a: string) => <span key={a} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">{a} thn</span>)}
                {item.avgRating > 0 && (
                  <div className="ml-auto flex items-center gap-1 text-amber-500 text-xs font-bold">
                    <Star className="h-3 w-3 fill-amber-500" /> {item.avgRating.toFixed(1)}
                  </div>
                )}
              </div>

              <h3 className="font-bold text-lg text-slate-800 leading-snug mb-2 group-hover:text-emerald-600 transition-colors">{item.title}</h3>

              <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">{item.description || 'Klik untuk membaca selengkapnya.'}</p>

              <div className="border-t border-slate-100 pt-3 flex items-center gap-4 text-slate-400 text-xs font-medium">
                <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likeCount}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.viewCount}</span>
                <span className="ml-auto text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">
                  Baca <ArrowRight className="h-3 w-3" />
                </span>
              </div>
              </div>
            </Link>
          ))}

          {items.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
              <MessageCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-lg">Belum ada QnA</p>
              <p className="text-sm mt-1">Konten sedang dalam proses penulisan.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
