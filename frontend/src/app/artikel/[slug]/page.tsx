import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, Lightbulb, User } from "lucide-react";
import BacaJuga from "@/components/BacaJuga";
import { EngagementBar } from "@/components/ui/EngagementBar";
import UnifiedBlockRenderer from "@/components/UnifiedBlockRenderer";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import NarrationAudioPlayer from "@/components/NarrationAudioPlayer";
import StoryboardVideoPlayer from "@/components/StoryboardVideoPlayer";
import type { Metadata } from "next";
import { JsonLd, buildArticleSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';
  try {
    const content = await fetchContentBySlug(slug);
    const canonical = `${SITE_URL}/artikel/${slug}`;
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
        section: content.node?.title || 'Artikel',
      },
      twitter: { card: "summary_large_image", title: content.title, description: content.description || "" },
    };
  } catch { return { title: "Artikel" }; }
}

export default async function ArtikelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';

  let content: any;
  try {
    content = await fetchContentBySlug(slug);
  } catch {
    notFound();
  }

  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';
  const pageUrl = `${SITE_URL}/artikel/${slug}`;

  const articleSchema = buildArticleSchema({
    title: content.title,
    description: content.description || '',
    imageUrl: content.thumbnailUrl,
    publishedAt: content.publishedAt,
    updatedAt: content.updatedAt,
    authorName,
    url: pageUrl,
    category: content.node?.title,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Beranda', url: SITE_URL },
    { name: 'Artikel', url: `${SITE_URL}/artikel` },
    { name: content.title, url: pageUrl },
  ]);

  return (
    <article className="container mx-auto px-4 md:px-6 py-12 pt-28 max-w-3xl" itemScope itemType="https://schema.org/Article">
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <Link href="/artikel" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8 font-bold text-sm">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Artikel
      </Link>

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
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold px-3 py-1 bg-sky-50 text-sky-700 rounded-full">Artikel</span>
          {content.pov === 'ORTU' && <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">👨‍👩‍👧 Orang Tua</span>}
          {content.pov === 'ANAK' && <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">👦 Anak</span>}
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{(content.ageGroups || []).join(', ')} tahun</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3">{content.title}</h1>
        {content.description && (
          <p className="text-slate-500 leading-relaxed mb-4 text-lg">{content.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4" /> {authorName}</span>
          {content.avgRating > 0 && <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="h-4 w-4 fill-amber-500" /> {content.avgRating.toFixed(1)}</span>}
          <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {content.likeCount}</span>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {content.viewCount}</span>
          {content.publishedAt && <time dateTime={new Date(content.publishedAt).toISOString()} className="text-xs text-slate-400">{new Date(content.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</time>}
        </div>
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {content.tags.map((t: any, i: number) => (
              <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">#{t.tag?.name || t.name || t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Audio Player — skip when StoryboardVideoPlayer already provides audio toggle */}
      {!content.storyboardVideoUrl && (
        content.enableAudio && content.audioUrl ? (
          <NarrationAudioPlayer audioUrl={content.audioUrl} title={content.title} thumbnailUrl={content.thumbnailUrl} />
        ) : (
          <AudioPlayerWrapper blocks={
            [
              ...(content.openingAudio !== false && content.openingText ? [{ type: 'paragraph', text: content.openingText, enableAudio: true }] : []),
              ...(content.articleDetail?.blocks || [
                ...(content.qnaDetail?.answerQuick ? [{ type: 'quick_answer', text: content.qnaDetail.answerQuick }] : []),
                ...(Array.isArray(content.qnaDetail?.blocks) ? content.qnaDetail.blocks : []),
              ]),
              ...(content.closingAudio !== false && content.closingText ? [{ type: 'paragraph', text: content.closingText, enableAudio: true }] : []),
            ]
          } enableAudio={content.enableAudio} contentType={content.type} />
        )
      )}

      {/* Opening / Mukadimah */}
      {content.openingText && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🕌 Pembukaan</p>
          <p className="text-emerald-900 font-medium leading-relaxed whitespace-pre-line">{content.openingText}</p>
        </div>
      )}

      {/* Article Blocks Renderer — shared renderer */}
      {content.articleDetail && (
        <UnifiedBlockRenderer blocks={content.articleDetail.blocks || []} variant="artikel" />
      )}

      {/* QNA fallback for mixed content — shared renderer */}
      {content.qnaDetail && (
        <div className="space-y-8">
          {content.qnaDetail.answerQuick && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
              <p className="text-emerald-900 font-medium leading-relaxed">{content.qnaDetail.answerQuick}</p>
            </div>
          )}
          <UnifiedBlockRenderer blocks={Array.isArray(content.qnaDetail.blocks) ? content.qnaDetail.blocks : []} variant="qna" />
        </div>
      )}

      {/* Closing / Penutupan */}
      {content.closingText && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mt-6 mb-6">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🤲 Penutupan</p>
          <p className="text-amber-900 font-medium leading-relaxed whitespace-pre-line">{content.closingText}</p>
        </div>
      )}

      {/* Baca Juga */}
      <BacaJuga items={content.related} />

      <EngagementBar
        contentId={content.id}
        initialLikes={content.likeCount || 0}
        initialBookmarks={content.bookmarkCount || 0}
        initialRating={content.avgRating || 0}
        initialShares={content.shareCount || 0}
        initialViews={content.viewCount || 0}
      />
    </article>
  );
}
