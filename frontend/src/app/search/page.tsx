"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, BookOpen, HelpCircle, Eye, Heart, Star, GraduationCap } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

const TYPE_OPTIONS = [
  { value: "", label: "Semua Tipe" },
  { value: "QNA", label: "Tanya Jawab" },
  { value: "PEMBELAJARAN", label: "Pembelajaran" },
  { value: "ARTICLE", label: "Artikel" },
  { value: "KISAH", label: "Kisah" },
];

const AGE_OPTIONS = [
  { value: "", label: "Semua Usia" },
  { value: "3-5", label: "Balita (3-5 thn)" },
  { value: "5-7", label: "Anak (5-7 thn)" },
  { value: "7-10", label: "Pramuka (7-10 thn)" },
  { value: "10-13", label: "Pra-Remaja (10-13 thn)" },
];

function SearchContent() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("");
  const [age, setAge] = useState("");

  const search = async (searchQ?: string) => {
    const sq = searchQ ?? query;
    if (!sq || sq.length < 2) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ q: sq });
      if (type) p.set("type", type);
      if (age) p.set("age", age);
      const r = await fetch(`${API_BASE_URL}/content/search?${p}`);
      const data = await r.json();
      setResults(data.data || []); setTotal(data.meta?.total || 0);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { if (q) { setQuery(q); search(q); } }, [q]);
  useEffect(() => { if (query) search(); }, [type, age]);

  const getTypeInfo = (r: any) => {
    if (r.type === "QNA") return { icon: <HelpCircle size={16} />, label: "Tanya Jawab", bg: "bg-amber-100 text-amber-600" };
    if (r.type === "PEMBELAJARAN") return { icon: <GraduationCap size={16} />, label: "Pembelajaran", bg: "bg-emerald-100 text-emerald-600" };
    if (r.type === "KISAH") return { icon: <BookOpen size={16} />, label: "Kisah", bg: "bg-orange-100 text-orange-600" };
    return { icon: <BookOpen size={16} />, label: "Artikel", bg: "bg-sky-100 text-sky-600" };
  };

  const getContentUrl = (r: any) => {
    if (r.type === "QNA") return `/qna/${r.slug}`;
    if (r.type === "KISAH") {
      const nodeSlug = r.node?.slug || 'kisah';
      return `/kisah/${nodeSlug}/${r.slug}`;
    }
    return `/artikel/${r.slug}`;
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl min-h-screen">
      <h1 className="text-3xl font-extrabold text-slate-800 mb-6">Cari Konten</h1>
      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} className="w-full border border-slate-300 rounded-xl pl-11 pr-4 py-3 text-sm font-medium" placeholder="Ketik kata kunci..." />
        </div>
        <button onClick={() => search()} className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700">Cari</button>
      </div>

      <div className="flex gap-2 mb-6">
        <select value={type} onChange={e => setType(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={age} onChange={e => setAge(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
          {AGE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {total > 0 && <span className="self-center text-sm text-slate-500 ml-auto">{total} hasil ditemukan</span>}
      </div>

      {loading ? <div className="text-center py-10 text-slate-500">Mencari...</div> :
       results.length === 0 ? <div className="text-center py-20 text-slate-400"><Search size={48} className="mx-auto opacity-30 mb-4" /><p className="text-lg">{query ? "Tidak ditemukan." : "Ketik kata kunci untuk mulai mencari."}</p></div> :
       <div className="space-y-3">
        {results.map(r => {
          const info = getTypeInfo(r);
          return (
          <Link key={r.id} href={getContentUrl(r)} className="block bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${info.bg}`}>{info.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{r.title}</h3>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${info.bg}`}>{info.label}</span>
                </div>
                {r.description && <p className="text-sm text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1"><Eye size={12} /> {r.viewCount}</span>
                  <span className="flex items-center gap-1"><Heart size={12} /> {r.likeCount}</span>
                  <span className="flex items-center gap-1"><Star size={12} /> {r.avgRating?.toFixed(1)}</span>
                  {r.ageGroups?.length > 0 && <span className="bg-slate-100 px-2 py-0.5 rounded">{r.ageGroups.join(', ')} thn</span>}
                </div>
              </div>
            </div>
          </Link>
          );
        })}
       </div>}
    </div>
  );
}

export default function SearchPage() {
  return <Suspense fallback={<div className="p-8 text-center">Memuat...</div>}><SearchContent /></Suspense>;
}
