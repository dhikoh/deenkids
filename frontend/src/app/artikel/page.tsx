"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Search, ThumbsUp, Eye, Star, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const AGE_OPTIONS = ["", "3-5", "5-7", "7-10", "10-13"];

const POV_OPTIONS = [
  { value: "", label: "Semua Pembaca", icon: "👥" },
  { value: "ORTU", label: "Orang Tua", icon: "👨‍👩‍👧" },
  { value: "ANAK", label: "Anak", icon: "👦" },
];

const POV_BADGE: Record<string, { label: string; color: string }> = {
  ORTU: { label: "Orang Tua", color: "bg-teal-50 text-teal-700 border-teal-200" },
  ANAK: { label: "Anak", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

export default function ArtikelPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [ageFilter, setAgeFilter] = useState("");
  const [povFilter, setPovFilter] = useState("");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ sort, limit: "20", type: "ARTICLE" });
    if (search) params.append("search", search);
    if (ageFilter) params.append("age", ageFilter);
    if (povFilter) params.append("pov", povFilter);
    fetch(`${API_BASE_URL}/content/list?${params}`)
      .then((res) => res.json())
      .then((json) => setItems(json.data || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [sort, search, ageFilter, povFilter]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-4">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Artikel &amp; Panduan</h1>
        <p className="text-slate-500 max-w-xl font-medium">
          Kumpulan artikel parenting Islami — sesuai Alquran dan Hadist.
        </p>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2 mb-8">
        <div className="relative flex-grow flex items-center">
          <Search className="absolute left-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari artikel..."
            className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-slate-700 text-sm font-medium"
          />
        </div>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        {/* POV Filter */}
        <select
          value={povFilter}
          onChange={e => setPovFilter(e.target.value)}
          className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-bold cursor-pointer border-none rounded-xl hover:bg-slate-50 transition-colors"
        >
          {POV_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
          ))}
        </select>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        {/* Age Filter */}
        <select
          value={ageFilter}
          onChange={e => setAgeFilter(e.target.value)}
          className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-bold cursor-pointer border-none rounded-xl hover:bg-slate-50 transition-colors"
        >
          <option value="">Semua Usia</option>
          {AGE_OPTIONS.filter(a => a).map(a => <option key={a} value={a}>{a} Tahun</option>)}
        </select>
        <div className="h-px md:w-px md:h-10 bg-slate-200"></div>
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="h-10 px-4 bg-transparent outline-none text-slate-600 text-sm font-bold cursor-pointer border-none rounded-xl hover:bg-slate-50 transition-colors"
        >
          <option value="newest">Terbaru</option>
          <option value="most_read">Paling Banyak Dibaca</option>
          <option value="top_rated">Rating Tertinggi</option>
          <option value="most_liked">Paling Disukai</option>
        </select>
      </div>

      {loading && (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
              <div className="h-6 bg-slate-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid md:grid-cols-2 gap-6">
          {items.map((item: any) => (
            <Link
              href={`/artikel/${item.slug}`}
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
            >
              {item.thumbnailUrl && (
                <div className="w-full aspect-video overflow-hidden">
                  <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-md uppercase tracking-wider">Artikel</span>
                  {/* POV Badge */}
                  {item.pov && POV_BADGE[item.pov] && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${POV_BADGE[item.pov].color}`}>
                      {item.pov === "ORTU" ? "👨‍👩‍👧" : "👦"} {POV_BADGE[item.pov].label}
                    </span>
                  )}
                  {(item.ageGroups || []).map((a: string) => (
                    <span key={a} className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">{a} thn</span>
                  ))}
                  {item.avgRating > 0 && (
                    <div className="ml-auto flex items-center gap-1 text-amber-500 text-xs font-bold">
                      <Star className="h-3 w-3 fill-amber-500" /> {item.avgRating.toFixed(1)}
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
                <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mt-4">
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
              <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-lg">Belum ada artikel</p>
              <p className="text-sm mt-1">Konten sedang dalam proses penulisan oleh tim asatidzah.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
