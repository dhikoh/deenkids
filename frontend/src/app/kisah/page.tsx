import Link from "next/link";
import { fetchKisahTree } from "@/lib/api";
import { BookOpen, ChevronRight, ScrollText, Star, Sparkles, Search, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kisah Islami — Adably",
  description: "Kumpulan kisah Islami untuk anak: Sirah Nabawiyah, Kisah Teladan, dan Cerita Fiksi yang menarik dan penuh hikmah.",
  openGraph: { title: "Kisah Islami — Adably", description: "Kisah inspiratif Islami untuk anak-anak.", type: "website" },
};

const SUB_CATEGORY_STYLE: Record<number, { bg: string; icon: string; iconBg: string; accent: string; textAccent: string }> = {
  0: { bg: "from-amber-50 to-orange-50", icon: "text-amber-600", iconBg: "bg-amber-100", accent: "border-amber-200", textAccent: "text-amber-700" },
  1: { bg: "from-emerald-50 to-teal-50", icon: "text-emerald-600", iconBg: "bg-emerald-100", accent: "border-emerald-200", textAccent: "text-emerald-700" },
  2: { bg: "from-violet-50 to-purple-50", icon: "text-violet-600", iconBg: "bg-violet-100", accent: "border-violet-200", textAccent: "text-violet-700" },
};

const ICONS = [ScrollText, Star, Sparkles];

export default async function KisahPage() {
  let categories: any[] = [];
  try {
    categories = await fetchKisahTree();
  } catch {
    categories = [];
  }

  // Flatten to show top-level nodes as sub-categories
  const topLevel = categories.filter((n: any) => !n.parentId);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-14">
        <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-4 shadow-md shadow-amber-200/60">
          <BookOpen className="h-9 w-9" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 mb-3 tracking-tight">
          Kisah <span className="text-amber-500">Islami</span>
        </h1>
        <p className="text-slate-500 max-w-xl font-medium text-lg leading-relaxed">
          Kumpulan kisah penuh hikmah untuk menumbuhkan akhlak mulia sejak dini.
        </p>

        {/* Search Bar — GET /search?q=...&type=KISAH */}
        <form action="/search" method="get" className="w-full max-w-xl mt-6">
          <input type="hidden" name="type" value="KISAH" />
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-amber-200 flex gap-2">
            <div className="relative flex-grow flex items-center">
              <Search className="absolute left-3 h-5 w-5 text-amber-400 pointer-events-none" />
              <input
                type="text"
                name="q"
                placeholder="Cari nama kisah atau tokoh..."
                className="w-full h-10 pl-10 pr-4 bg-transparent outline-none text-slate-700 text-sm font-medium"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 flex items-center gap-2 text-sm transition-colors"
            >
              Cari <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Sub-category cards */}
      {topLevel.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {topLevel.map((cat: any, idx: number) => {
            const style = SUB_CATEGORY_STYLE[idx % 3];
            const Icon = ICONS[idx % 3];
            return (
              <Link
                key={cat.id}
                href={`/kisah/${cat.slug}`}
                className={`group bg-gradient-to-br ${style.bg} rounded-3xl border ${style.accent} shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                <div className="p-8 flex flex-col items-center text-center gap-4">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${style.iconBg} shadow-inner transition-transform group-hover:scale-110 duration-300`}>
                    <Icon className={`h-8 w-8 ${style.icon}`} />
                  </div>
                  <div>
                    <h2 className={`text-xl font-extrabold ${style.textAccent} mb-1 group-hover:underline`}>{cat.title}</h2>
                    <p className="text-sm text-slate-500 leading-relaxed">{cat.description || "Koleksi kisah untuk anak."}</p>
                  </div>
                  {cat.contentCount > 0 && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full bg-white/70 ${style.textAccent} border ${style.accent}`}>
                      {cat.contentCount} Kisah
                    </span>
                  )}
                  <div className={`flex items-center gap-1 text-xs font-bold ${style.textAccent} mt-1 group-hover:gap-2 transition-all`}>
                    Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 max-w-xl mx-auto">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500 text-lg">Kisah belum tersedia</p>
          <p className="text-sm text-slate-400 mt-1">Segera hadir, insya Allah.</p>
        </div>
      )}
    </div>
  );
}
