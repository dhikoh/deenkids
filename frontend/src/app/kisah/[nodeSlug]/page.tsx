import Link from "next/link";
import { fetchKisahByNode } from "@/lib/api";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Volume2, Star, Eye, User, BookOpen } from "lucide-react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ nodeSlug: string }> }): Promise<Metadata> {
  const { nodeSlug } = await params;
  try {
    const res = await fetchKisahByNode(nodeSlug, 1, 1);
    const node = res?.node;
    return {
      title: `${node?.title || "Kisah"} — Adably`,
      description: node?.description || `Kumpulan kisah Islami dalam kategori ${node?.title || "Kisah"}.`,
    };
  } catch { return { title: "Kisah Islami — Adably" }; }
}

export default async function KisahSubcategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ nodeSlug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { nodeSlug } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1"));

  let result: any;
  try {
    result = await fetchKisahByNode(nodeSlug, page, 12);
  } catch {
    notFound();
  }

  const { node, data: stories, meta } = result;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28">
      {/* Breadcrumb */}
      <Link href="/kisah" className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-8 font-bold text-sm gap-1">
        <ChevronLeft className="h-4 w-4" /> Kembali ke Kisah
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
            <BookOpen className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">{node?.title}</h1>
        </div>
        {node?.description && (
          <p className="text-slate-500 ml-14 text-sm leading-relaxed">{node.description}</p>
        )}
        <p className="text-slate-400 ml-14 text-xs mt-1 font-medium">{meta.total} kisah tersedia</p>
      </div>

      {/* Story Grid */}
      {stories.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {stories.map((story: any) => (
            <Link
              key={story.id}
              href={`/kisah/${nodeSlug}/${story.slug}`}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col"
            >
              {/* Thumbnail */}
              {story.thumbnailUrl ? (
                <div className="aspect-video bg-slate-100 overflow-hidden">
                  <img src={story.thumbnailUrl} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-amber-300" />
                </div>
              )}

              <div className="p-5 flex flex-col flex-1">
                {/* Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                    {node?.title}
                  </span>
                  {story.enableAudio && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Volume2 className="h-2.5 w-2.5" /> Audio
                    </span>
                  )}
                  {(story.ageGroups || []).map((ag: string) => (
                    <span key={ag} className="text-[10px] font-medium px-2 py-0.5 bg-slate-50 text-slate-500 rounded-full border border-slate-200">
                      {ag} thn
                    </span>
                  ))}
                </div>

                <h2 className="font-bold text-slate-800 text-base mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
                  {story.title}
                </h2>
                {story.description && (
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">{story.description}</p>
                )}

                <div className="mt-auto flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> {story.authorName}</span>
                  <div className="flex items-center gap-3">
                    {story.avgRating > 0 && <span className="flex items-center gap-0.5 text-amber-500 font-bold"><Star className="h-3 w-3 fill-amber-500" /> {story.avgRating.toFixed(1)}</span>}
                    <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {story.viewCount}</span>
                  </div>
                </div>
              </div>

              <div className="px-5 pb-4">
                <div className="flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:gap-2 transition-all">
                  Baca Kisah <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-500">Belum ada kisah di kategori ini</p>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          {page > 1 && (
            <Link href={`/kisah/${nodeSlug}?page=${page - 1}`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" /> Sebelumnya
            </Link>
          )}
          <span className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-700">
            {page} / {meta.totalPages}
          </span>
          {page < meta.totalPages && (
            <Link href={`/kisah/${nodeSlug}?page=${page + 1}`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1">
              Berikutnya <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
