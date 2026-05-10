import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, User, Volume2 } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";
import UnifiedBlockRenderer from "@/components/UnifiedBlockRenderer";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import NarrationAudioPlayer from "@/components/NarrationAudioPlayer";
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

  // Audio for KISAH: title + description + all readable blocks (respecting enableAudio)
  const audioBlocks: any[] = [
    ...(content.openingAudio !== false && content.openingText ? [{ type: 'paragraph', text: content.openingText, enableAudio: true }] : []),
    ...(content.audioTitle !== false && content.title ? [{ type: 'paragraph', text: content.title, enableAudio: true }] : []),
    ...(content.audioDescription !== false && content.description ? [{ type: 'paragraph', text: content.description, enableAudio: true }] : []),
    ...blocks.filter((b: any) => (b.type === 'paragraph') && b.enableAudio !== false),
    ...(content.closingAudio !== false && content.closingText ? [{ type: 'paragraph', text: content.closingText, enableAudio: true }] : []),
  ];

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

      {/* Audio Player — enableAudio is master gate; MP3 takes priority over browser TTS */}
      {content.enableAudio && content.audioUrl ? (
        <div className="mb-6">
          <NarrationAudioPlayer audioUrl={content.audioUrl} title={content.title} thumbnailUrl={content.thumbnailUrl} />
        </div>
      ) : content.enableAudio && (
        <div className="mb-6">
          <AudioPlayerWrapper blocks={audioBlocks} enableAudio={content.enableAudio} contentType={content.type} />
        </div>
      )}

      {/* Opening / Mukadimah */}
      {content.openingText && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🕌 Pembukaan</p>
          <p className="text-emerald-900 font-medium leading-relaxed whitespace-pre-line">{content.openingText}</p>
        </div>
      )}

      {/* Story Block Renderer — shared renderer (includes hikmah, doa, dalil, analogy, tip) */}
      <UnifiedBlockRenderer blocks={blocks} variant="kisah" />

      {/* Closing / Penutupan */}
      {content.closingText && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mt-6 mb-6">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🤲 Penutupan</p>
          <p className="text-amber-900 font-medium leading-relaxed whitespace-pre-line">{content.closingText}</p>
        </div>
      )}

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
