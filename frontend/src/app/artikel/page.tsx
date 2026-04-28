"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Search, ThumbsUp, Eye, Star, ArrowRight } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

export default function ArtikelPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE_URL}/content/list?sort=newest&limit=20`)
      .then((res) => res.json())
      .then((json) => {
        const articles = (json.data || []).filter((item: any) => item.type === 'ARTICLE');
        setItems(articles);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      <div className="flex flex-col items-center text-center mb-10">
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 mb-4">
          <BookOpen className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Artikel & Panduan</h1>
        <p className="text-slate-500 max-w-xl font-medium">
          Kumpulan artikel parenting Islami — sesuai Alquran dan Hadist.
        </p>
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
            <Link href={`/qna/${item.slug}`} key={item.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-bold px-2 py-1 bg-amber-50 text-amber-700 rounded-md uppercase tracking-wider">Artikel</span>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">{item.ageGroup}</span>
                {item.avgRating > 0 && (
                  <div className="ml-auto flex items-center gap-1 text-amber-500 text-xs font-bold"><Star className="h-3 w-3 fill-amber-500" /> {item.avgRating.toFixed(1)}</div>
                )}
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-2 group-hover:text-emerald-600 transition-colors">{item.title}</h3>
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium mt-4">
                <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {item.likeCount}</span>
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {item.viewCount}</span>
                <span className="ml-auto text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 font-bold">Baca <ArrowRight className="h-3 w-3" /></span>
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
