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
import { JsonLd, buildFaqPageSchema, buildBreadcrumbSchema } from "@/components/seo/JsonLd";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';
  try {
    const content = await fetchContentBySlug(slug);
    const canonical = `${SITE_URL}/qna/${slug}`;
    // Format judul SEO-friendly untuk halaman QNA (pertanyaan biasanya judul)
    const seoTitle = content.title.endsWith('?') ? content.title : `${content.title}?`;
    return {
      title: seoTitle,
      description: content.description || content.title,
      alternates: { canonical },
      openGraph: {
        title: seoTitle,
        description: content.description || content.title,
        type: "article",
        url: canonical,
        images: [{ url: content.thumbnailUrl || `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: content.title }],
        publishedTime: content.publishedAt ? new Date(content.publishedAt).toISOString() : undefined,
        modifiedTime: content.updatedAt ? new Date(content.updatedAt).toISOString() : undefined,
        authors: [content.displayAuthorName || content.author?.name || 'Adably'],
        section: 'Tanya Jawab Islam Anak',
      },
      twitter: { card: "summary_large_image", title: seoTitle, description: content.description || "" },
    };
  } catch {
    return { title: "Konten" };
  }
}

export default async function QnaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';

  let content: any;
  try {
    content = await fetchContentBySlug(slug);
  } catch {
    notFound();
  }

  const qna = content.qnaDetail;
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';
  const pageUrl = `${SITE_URL}/qna/${slug}`;

  // FAQPage schema — mendukung rich snippet di Google
  const faqSchema = buildFaqPageSchema({
    question: content.title,
    answer: qna?.answerQuick || content.description || content.title,
    url: pageUrl,
  });

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: 'Beranda', url: SITE_URL },
    { name: 'Tanya Jawab', url: `${SITE_URL}/qna` },
    { name: content.title, url: pageUrl },
  ]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28 max-w-3xl">
      <JsonLd schema={faqSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <Link href={content.type === 'QNA' ? '/qna' : '/artikel'} className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8 font-bold text-sm">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
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
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">{content.type === 'QNA' ? 'Tanya Jawab' : 'Artikel'}</span>
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
        </div>
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {content.tags.map((t: any, i: number) => (
              <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">#{t.tag?.name || t.name || t}</span>
            ))}
          </div>
        )}
      </div>

      {qna && (
        <div className="space-y-8">
          {/* Audio Player — enableAudio is master gate; MP3 takes priority over browser TTS */}
          {content.enableAudio && content.audioUrl ? (
            <NarrationAudioPlayer audioUrl={content.audioUrl} title={content.title} thumbnailUrl={content.thumbnailUrl} />
          ) : (
            <AudioPlayerWrapper blocks={[
              ...(content.openingAudio !== false && content.openingText ? [{ type: 'paragraph', text: content.openingText, enableAudio: true }] : []),
              ...(content.audioTitle !== false && content.title ? [{ type: 'paragraph', text: content.title, enableAudio: true }] : []),
              ...(content.audioDescription !== false && content.description ? [{ type: 'paragraph', text: content.description, enableAudio: true }] : []),
              ...(qna.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
              ...(Array.isArray(qna.blocks) ? qna.blocks : []),
              ...(content.closingAudio !== false && content.closingText ? [{ type: 'paragraph', text: content.closingText, enableAudio: true }] : []),
            ]} enableAudio={content.enableAudio} contentType={content.type} />
          )}

          {/* Opening / Mukadimah */}
          {content.openingText && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🕌 Pembukaan</p>
              <p className="text-emerald-900 font-medium leading-relaxed whitespace-pre-line">{content.openingText}</p>
            </div>
          )}

          {/* Quick Answer Card — always shown first */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
            <p className="text-emerald-900 font-medium leading-relaxed">{qna.answerQuick}</p>
            {qna.answerQuickReferenceUrl && <a href={qna.answerQuickReferenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}
          </div>

          {/* Content Blocks — shared renderer */}
          <UnifiedBlockRenderer blocks={Array.isArray(qna.blocks) ? qna.blocks : []} variant="qna" />
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

      {/* Engagement Bar */}
      <EngagementBar
        contentId={content.id}
        initialLikes={content.likeCount || 0}
        initialBookmarks={content.bookmarkCount || 0}
        initialRating={content.avgRating || 0}
        initialShares={content.shareCount || 0}
        initialViews={content.viewCount || 0}
      />
    </div>
  );
}
