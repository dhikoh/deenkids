"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, BookOpen, Eye, Heart, Search, ArrowRight, Volume2 } from "lucide-react";
import { fetchContentTree, fetchContentList } from "@/lib/api";

const AGE_FILTERS = [
  { label: "Semua Usia", value: "" },
  { label: "3-5 Tahun", value: "3-5" },
  { label: "5-7 Tahun", value: "5-7" },
  { label: "7-10 Tahun", value: "7-10" },
  { label: "10-13 Tahun", value: "10-13" },
];

const SORT_OPTIONS = [
  { label: "Terbaru", value: "newest" },
  { label: "Terpopuler", value: "popular" },
  { label: "Terbanyak Dibaca", value: "most_read" },
];

function ContentSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
      <div className="h-4 w-20 bg-slate-100 rounded-full mb-3" />
      <div className="h-6 w-3/4 bg-slate-100 rounded-lg mb-2" />
      <div className="h-4 w-full bg-slate-100 rounded mb-1" />
      <div className="h-4 w-2/3 bg-slate-100 rounded" />
    </div>
  );
}

export default function PembelajaranDetail() {
  const params = useParams();
  const slug = params.slug as string;

  const [node, setNode] = useState<any>(null);
  const [contents, setContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingContents, setLoadingContents] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedAge, setSelectedAge] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Resolve node info dari content tree
  useEffect(() => {
    setLoading(true);
    fetchContentTree()
      .then((data: any) => {
        const tree: any[] = Array.isArray(data) ? data : (data?.data || []);
        // Flatten tree to find node by slug
        const flatten = (nodes: any[]): any[] =>
          nodes.flatMap((n: any) => [n, ...(n.children ? flatten(n.children) : [])]);
        const found = flatten(tree).find((n: any) => n.slug === slug);
        if (found) {
          setNode(found);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fetch konten PEMBELAJARAN untuk node ini
  useEffect(() => {
    setLoadingContents(true);
    fetchContentList({
      type: "PEMBELAJARAN",
      nodeSlug: slug,
      age: selectedAge || undefined,
      sort,
      page,
      limit: 12,
    })
      .then((res: any) => {
        setContents(res?.data || []);
        setTotalPages(res?.meta?.totalPages || 1);
        setTotal(res?.meta?.total || 0);
      })
      .catch(() => setContents([]))
      .finally(() => setLoadingContents(false));
  }, [slug, selectedAge, sort, page]);

  // Reset page saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [selectedAge, sort]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-28">
        <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse mb-6" />
        <div className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="container mx-auto px-4 py-8 pt-28 text-center">
        <Link href="/pembelajaran" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6">
          <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Pembelajaran
        </Link>
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-200">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-700 mb-2">Kategori tidak ditemukan</h1>
          <p className="text-slate-500">Kategori pembelajaran ini tidak tersedia atau sudah dipindahkan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8 pt-28">
      {/* Breadcrumb */}
      <Link href="/pembelajaran" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-6 font-medium text-sm">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Pembelajaran
      </Link>

      {/* Node Header */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 border border-emerald-100 mb-8">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-200 text-teal-700 border border-teal-300 flex items-center justify-center mb-5 shadow-sm">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-2">{node?.title}</h1>
        {node?.description && (
          <p className="text-slate-600 font-medium text-lg leading-relaxed">{node.description}</p>
        )}
        <p className="text-sm text-emerald-600 font-bold mt-3">{total} konten tersedia</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Age Filter */}
        <div className="flex flex-wrap gap-2 flex-1">
          {AGE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setSelectedAge(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${
                selectedAge === f.value
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border border-slate-200 rounded-xl px-4 py-2 text-sm font-medium text-slate-600 bg-white focus:border-emerald-400 focus:ring-0"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content Grid */}
      {loadingContents ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => <ContentSkeleton key={i} />)}
        </div>
      ) : contents.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contents.map((item: any) => (
              <Link href={`/artikel/${item.slug}`} key={item.id} className="group">
                <div className="h-full bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 overflow-hidden">
                  {item.thumbnailUrl && (
                    <div className="w-full aspect-video overflow-hidden">
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        Pembelajaran
                      </span>
                      {item.enableAudio && (
                        <span className="flex items-center gap-1 text-xs text-purple-500 font-bold">
                          <Volume2 size={12} /> Audio
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-medium ml-auto">
                        {(item.ageGroups || []).join(", ")}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {item.title}
                    </h2>
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
                      {item.description || "Materi pembelajaran Islam untuk anak."}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Eye size={13} /> {(item.viewCount || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Heart size={13} /> {(item.likeCount || 0).toLocaleString()}</span>
                      {(item.displayAuthorName || item.author?.name) && (
                        <span className="ml-auto font-medium text-slate-500 truncate">
                          {item.displayAuthorName || item.author.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Sebelumnya
              </button>
              <span className="px-4 py-2 text-sm font-bold text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="h-10 w-10 text-slate-300 mb-4" />
          <p className="text-slate-500 font-bold text-lg">Belum ada konten untuk kategori ini</p>
          <p className="text-slate-400 text-sm mt-1">
            {selectedAge ? `Tidak ada konten untuk usia ${selectedAge} tahun.` : "Konten sedang dalam proses penulisan."}
          </p>
          {selectedAge && (
            <button
              onClick={() => setSelectedAge("")}
              className="mt-4 text-sm font-bold text-emerald-600 hover:text-emerald-700 underline"
            >
              Lihat semua usia
            </button>
          )}
        </div>
      )}
    </div>
  );
}
