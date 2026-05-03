import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, User, Volume2, Lightbulb, Quote } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ nodeSlug: string; storySlug: string }> }): Promise<Metadata> {
  const { storySlug } = await params;
  try {
    const content = await fetchContentBySlug(storySlug);
    return {
      title: content.title + " — Adably",
      description: content.description || content.title,
      openGraph: {
        title: content.title,
        description: content.description || content.title,
        type: "article",
        images: [{ url: content.thumbnailUrl || "/og-image.png", width: 1200, height: 630 }],
      },
    };
  } catch { return { title: "Kisah Islami — Adably" }; }
}

export default async function KisahDetailPage({
  params,
}: {
  params: Promise<{ nodeSlug: string; storySlug: string }>;
}) {
  const { nodeSlug, storySlug } = await params;

  let content: any;
  try {
    content = await fetchContentBySlug(storySlug);
  } catch {
    notFound();
  }

  // Ensure this is actually a Kisah content
  if (content.type !== "KISAH") notFound();

  const authorName = content.authorName || content.displayAuthorName || content.author?.name || "Anonim";
  const blocks: any[] = content.articleDetail?.blocks || [];

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28 max-w-3xl">
      {/* Breadcrumb */}
      <Link href={`/kisah/${nodeSlug}`} className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-8 font-bold text-sm gap-1">
        <ChevronLeft className="h-4 w-4" /> Kembali ke {content.node?.title || "Kisah"}
      </Link>

      {/* Header */}
      <div className="mb-8">
        {content.thumbnailUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-contain" />
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200">Kisah</span>
          {content.node?.title && (
            <span className="text-xs font-bold px-3 py-1 bg-orange-50 text-orange-700 rounded-full border border-orange-200">{content.node.title}</span>
          )}
          {(content.ageGroups || []).map((ag: string) => (
            <span key={ag} className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{ag} tahun</span>
          ))}
          {content.enableAudio && (
            <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 flex items-center gap-1">
              <Volume2 className="h-3 w-3" /> Audio Tersedia
            </span>
          )}
        </div>

        <h1 className="text-3xl font-extrabold text-slate-800 mb-3 leading-tight">{content.title}</h1>
        {content.description && (
          <p className="text-slate-500 text-base leading-relaxed mb-4">{content.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4" /> {authorName}</span>
          {content.avgRating > 0 && <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="h-4 w-4 fill-amber-500" /> {content.avgRating.toFixed(1)}</span>}
          <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {content.likeCount}</span>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {content.viewCount}</span>
        </div>
      </div>

      {/* Audio Player — prominent for Kisah */}
      {content.enableAudio && (
        <div className="mb-6">
          <AudioPlayerWrapper blocks={blocks} enableAudio={content.enableAudio} contentType={content.type} />
        </div>
      )}

      {/* Story Block Renderer — NO dialog blocks for Kisah */}
      <div className="prose prose-slate max-w-none">
        {blocks.map((block: any, i: number) => {
          if (block.type === "heading") return (
            <h2 key={i} className="text-2xl font-extrabold text-slate-800 mt-10 mb-4 border-b border-amber-100 pb-2">
              {block.text}
            </h2>
          );

          if (block.type === "paragraph") return (
            <div key={i} className="mb-5">
              <p className="text-slate-700 leading-[1.9] text-base">{block.text}</p>
              {block.referenceUrl && (
                <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 underline hover:text-amber-800 mt-1 inline-block">
                  📎 Sumber referensi ↗
                </a>
              )}
            </div>
          );

          if (block.type === "dalil") {
            const entries = block.entries || [{ arabic: block.arabic, translation: block.translation, source: block.source, sourceUrl: block.sourceUrl }];
            return (
              <div key={i} className="space-y-3 my-6">
                {entries.map((dalil: any, j: number) => (
                  <blockquote key={j} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-2xl px-6 py-5 shadow-sm">
                    {dalil.arabic && <p className="text-right text-xl font-serif text-slate-800 mb-3 leading-loose" dir="rtl">{dalil.arabic}</p>}
                    <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                    <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">
                      — {dalil.sourceUrl ? <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">{dalil.source} ↗</a> : dalil.source}
                    </cite>
                  </blockquote>
                ))}
              </div>
            );
          }

          if (block.type === "tip") return (
            <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 my-5 flex gap-3">
              <Lightbulb className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-emerald-800 font-semibold text-sm leading-relaxed">{block.text}</p>
                {block.referenceUrl && (
                  <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline mt-1 inline-block hover:text-emerald-800">Sumber ↗</a>
                )}
              </div>
            </div>
          );

          if (block.type === "analogy") return (
            <div key={i} className="bg-orange-50 border border-orange-200 rounded-2xl p-5 my-5">
              <p className="text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">✨ Perumpamaan</p>
              <p className="text-orange-900 font-medium leading-relaxed">{block.text}</p>
              {block.explanation && <p className="text-sm text-orange-700 mt-2 italic">{block.explanation}</p>}
            </div>
          );

          if (block.type === "quote") return (
            <blockquote key={i} className="border-l-4 border-slate-300 pl-5 my-5 text-slate-600 italic">
              <Quote className="h-4 w-4 text-slate-400 mb-1" />
              <p className="leading-relaxed font-medium">{block.text}</p>
              {block.source && <cite className="block mt-2 text-xs font-bold text-slate-500 not-italic">— {block.source}</cite>}
            </blockquote>
          );

          if (block.type === "image") return (
            <figure key={i} className="my-6">
              <img src={block.url} alt={block.caption || ""} className="w-full rounded-2xl shadow-md object-cover" />
              {block.caption && <figcaption className="text-center text-xs text-slate-400 mt-2 italic">{block.caption}</figcaption>}
            </figure>
          );

          if (block.type === "video") return (
            <div key={i} className="my-6 aspect-video rounded-2xl overflow-hidden shadow-md">
              <iframe src={block.url} className="w-full h-full" allowFullScreen title={block.caption || "Video"} />
            </div>
          );

          // Skip dialog blocks — Kisah does not use dialog format
          return null;
        })}
      </div>

      {/* Related Content */}
      {content.related && content.related.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-5">Kisah Lainnya</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {content.related.map((rel: any) => (
              <Link
                key={rel.id}
                href={`/kisah/${nodeSlug}/${rel.slug}`}
                className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition-all"
              >
                {rel.thumbnailUrl ? (
                  <img src={rel.thumbnailUrl} alt={rel.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Volume2 className="h-6 w-6 text-amber-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-700 text-sm line-clamp-2 group-hover:text-amber-700">{rel.title}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1"><Eye className="h-3 w-3" /> {rel.viewCount}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Engagement */}
      <div className="mt-10 pt-8 border-t border-slate-100">
        <EngagementBar contentId={content.id} initialLikes={content.likeCount} initialBookmarks={content.bookmarkCount ?? 0} initialRating={content.avgRating} initialShares={content.shareCount ?? 0} initialViews={content.viewCount ?? 0} />
      </div>
    </div>
  );
}
