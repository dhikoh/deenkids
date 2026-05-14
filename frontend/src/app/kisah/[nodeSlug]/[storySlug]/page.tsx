import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, User, Volume2 } from "lucide-react";
import BacaJuga from "@/components/BacaJuga";
import { EngagementBar } from "@/components/ui/EngagementBar";
import UnifiedBlockRenderer from "@/components/UnifiedBlockRenderer";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import NarrationAudioPlayer from "@/components/NarrationAudioPlayer";
import StoryboardVideoPlayer from "@/components/StoryboardVideoPlayer";
import type { Metadata } from "next";
import { JsonLd, buildArticleSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ nodeSlug: string; storySlug: string }> }): Promise<Metadata> {
  const { nodeSlug, storySlug } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';
  try {
    const content = await fetchContentBySlug(storySlug);
    const canonical = `${SITE_URL}/kisah/${nodeSlug}/${storySlug}`;
    return {
      title: content.title,
      description: content.description || content.title,
      alternates: { canonical },
      openGraph: {
        title: content.title,
        description: content.description || content.title,
        type: "article",
        url: canonical,
        images: [{ url: content.thumbnailUrl || `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: content.title }],
        publishedTime: content.publishedAt ? new Date(content.publishedAt).toISOString() : undefined,
        modifiedTime: content.updatedAt ? new Date(content.updatedAt).toISOString() : undefined,
        authors: [content.displayAuthorName || content.author?.name || 'Adably'],
        section: 'Kisah Islami',
      },
      twitter: { card: "summary_large_image", title: content.title, description: content.description || "" },
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

  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || "Anonim";
  const blocks: any[] = content.articleDetail?.blocks || [];
  const pageUrl = `${SITE_URL}/kisah/${nodeSlug}/${storySlug}`;

  // JSON-LD structured data for Google Rich Results
  const articleSchema = buildArticleSchema({
    title: content.title,
    description: content.description || content.title,
    imageUrl: content.thumbnailUrl,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    authorName,
    url: pageUrl,
    category: 'Kisah Islami',
  });
  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Beranda', url: SITE_URL },
    { name: 'Kisah', url: `${SITE_URL}/kisah` },
    { name: content.node?.title || 'Kategori', url: `${SITE_URL}/kisah/${nodeSlug}` },
    { name: content.title, url: pageUrl },
  ]);

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
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />
      {/* Breadcrumb */}
      <Link href={`/kisah/${nodeSlug}`} className="inline-flex items-center text-amber-600 hover:text-amber-700 mb-8 font-bold text-sm gap-1">
        <ChevronLeft className="h-4 w-4" /> Kembali ke {content.node?.title || "Kisah"}
      </Link>

      {/* Header */}
      <div className="mb-8">
        {content.storyboardVideoUrl ? (
          <StoryboardVideoPlayer
            storyboardVideoUrl={content.storyboardVideoUrl}
            audioUrl={content.audioUrl}
            enableAudio={content.enableAudio}
            title={content.title}
          />
        ) : content.thumbnailUrl ? (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-contain" />
          </div>
        ) : null}

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

      {/* Baca Juga */}
      <BacaJuga items={content.related} />

      {/* Engagement */}
      <div className="mt-10 pt-8 border-t border-slate-100">
        <EngagementBar contentId={content.id} initialLikes={content.likeCount} initialBookmarks={content.bookmarkCount ?? 0} initialRating={content.avgRating} initialShares={content.shareCount ?? 0} initialViews={content.viewCount ?? 0} />
      </div>
    </div>
  );
}
