import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User, Sparkles } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import NarrationAudioPlayer from "@/components/NarrationAudioPlayer";
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
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28 max-w-3xl">
      <JsonLd schema={articleSchema} />
      <JsonLd schema={breadcrumbSchema} />
      <Link href="/artikel" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8 font-bold text-sm">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali ke Artikel
      </Link>

      <div className="mb-8">
        {content.thumbnailUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-contain" />
          </div>
        )}
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
        </div>
        {content.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {content.tags.map((t: any, i: number) => (
              <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">#{t.tag?.name || t.name || t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Audio Player — uploaded MinIO MP3 takes priority over browser TTS */}
      {content.audioUrl ? (
        <NarrationAudioPlayer audioUrl={content.audioUrl} />
      ) : (
        <AudioPlayerWrapper blocks={
          content.articleDetail?.blocks || [
            ...(content.qnaDetail?.answerQuick ? [{ type: 'quick_answer', text: content.qnaDetail.answerQuick }] : []),
            ...(content.qnaDetail?.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
            ...(content.qnaDetail?.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
            ...(content.qnaDetail?.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
            ...(content.qnaDetail?.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
          ]
        } enableAudio={content.enableAudio} contentType={content.type} />
      )}

      {/* Article Blocks Renderer */}
      {content.articleDetail && (
        <div className="prose prose-slate max-w-none">
          {(content.articleDetail.blocks as any[])?.map((block: any, i: number) => {
            if (block.type === 'heading') return <h2 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-3">{block.text}</h2>;
            if (block.type === 'paragraph') return <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-4"><p className="text-slate-600 leading-relaxed whitespace-pre-line">{block.text}</p>{block.referenceUrl && <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}</div>;
            if (block.type === 'quick_answer') return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h3>
                <p className="text-emerald-900 font-medium leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === 'dalil') {
              // Support multi-entry dalil
              const entries = block.entries || [{ arabic: block.arabic, translation: block.translation, source: block.source }];
              return (
                <div key={i} className="space-y-3 my-4">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Dalil & Landasan</h3>
                  {entries.map((dalil: any, j: number) => (
                    <blockquote key={j} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                      {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                      <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                      <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">— {dalil.sourceUrl ? <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">{dalil.source} ↗</a> : dalil.source}</cite>
                    </blockquote>
                  ))}
                </div>
              );
            }
            if (block.type === 'dialog') {
              // Support multi-line dialog
              const lines = block.lines || [{ role: block.role, text: block.text }];
              return (
                <div key={i} className="space-y-3 my-4 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Dialog</p>
                  {lines.map((line: any, j: number) => {
                    const cfg = ROLE_CONFIG[line.role] || ROLE_CONFIG.anak;
                    return (
                      <div key={j} className={`flex ${cfg.align}`}>
                        <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium ${cfg.chatBg}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">{cfg.label}</p>
                          {line.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            if (block.type === 'tip') return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Catatan / Tips</h3>
                <p className="text-emerald-800 text-sm font-medium">{block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs hover:text-emerald-900">Sumber ↗</a></>}</p>
              </div>
            );
            if (block.type === 'analogy') return (
              <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-teal-800 mb-2 flex items-center gap-2"><Quote className="h-4 w-4" /> Analogi Sederhana</h3>
                {block.title && <p className="font-bold text-teal-900 mb-1">{block.title}</p>}
                <p className="text-teal-700 font-medium">{block.text}</p>
              </div>
            );
            if (block.type === 'hikmah') return (
              <div key={i} className="bg-violet-50 border border-violet-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-violet-800 mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Hikmah & Pelajaran</h3>
                <p className="text-violet-700 font-medium leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === 'doa') return (
              <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">🤲 Doa</h3>
                {block.title && <p className="font-bold text-indigo-900 mb-2">{block.title}</p>}
                {block.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{block.arabic}</p>}
                <p className="text-indigo-700 italic font-medium">&ldquo;{block.translation}&rdquo;</p>
                {block.source && <cite className="block mt-2 text-sm font-bold text-indigo-600 not-italic">— {block.source}</cite>}
              </div>
            );
            if (block.type === 'image' && block.url) return <img key={i} src={block.url} alt={block.caption || ''} className="rounded-2xl w-full my-4 border border-slate-200" />;
            if (block.type === 'video' && block.url) {
              const ytMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
              if (ytMatch) return <div key={i} className="aspect-video rounded-2xl overflow-hidden my-4"><iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen /></div>;
              return <a key={i} href={block.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 rounded-xl p-4 my-4 text-emerald-600 font-bold hover:underline">🎬 {block.caption || block.url}</a>;
            }
            return null;
          })}
        </div>
      )}

      {/* QNA fallback for mixed content */}
      {content.qnaDetail && (
        <div className="space-y-8">
          {content.qnaDetail.answerQuick && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
              <p className="text-emerald-900 font-medium leading-relaxed">{content.qnaDetail.answerQuick}</p>
            </div>
          )}

          {content.qnaDetail.dialogBlocks?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Contoh Dialog</h2>
              <div className="space-y-3">
                {(content.qnaDetail.dialogBlocks as any[]).map((block: any, i: number) => {
                  const lines = block.lines || [{ role: block.role, text: block.text }];
                  return lines.map((line: any, j: number) => {
                    const cfg = ROLE_CONFIG[line.role] || ROLE_CONFIG.anak;
                    return (
                      <div key={`${i}-${j}`} className={`flex ${cfg.align}`}>
                        <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium ${cfg.chatBg}`}>
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">{cfg.label}</p>
                          {line.text}
                        </div>
                      </div>
                    );
                  });
                })}
              </div>
            </div>
          )}

          {content.qnaDetail.dalilBlocks?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-amber-600" /> Dalil & Sumber</h2>
              <div className="space-y-4">
                {(content.qnaDetail.dalilBlocks as any[]).map((dalilBlock: any, i: number) => {
                  const entries = dalilBlock.entries || [dalilBlock];
                  return entries.map((dalil: any, j: number) => (
                    <blockquote key={`${i}-${j}`} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                      {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                      <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                      <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">— {dalil.sourceUrl ? <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">{dalil.source} ↗</a> : dalil.source}</cite>
                    </blockquote>
                  ));
                })}
              </div>
            </div>
          )}

          {content.qnaDetail.analogyBlocks?.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Quote className="h-5 w-5 text-teal-600" /> Analogi untuk Anak</h2>
              {(content.qnaDetail.analogyBlocks as any[]).map((a: any, i: number) => (
                <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                  <h3 className="font-bold text-teal-800 mb-2">{a.title}</h3>
                  <p className="text-teal-700 font-medium">{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {content.qnaDetail.tipsBlocks?.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-3">💡 Tips untuk Orang Tua</h2>
              <ul className="space-y-2">
                {(content.qnaDetail.tipsBlocks as any[]).map((tip: any, i: number) => (
                  <li key={i} className="text-sm text-slate-600 font-medium flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{tip.text}{tip.referenceUrl && <> — <a href={tip.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-800 text-xs">Sumber ↗</a></>}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <EngagementBar
        contentId={content.id}
        initialLikes={content.likeCount || 0}
        initialBookmarks={content.bookmarkCount || 0}
        initialRating={content.avgRating || 0}
        initialShares={content.shareCount || 0}
        initialViews={content.viewCount || 0}
      />

      {content.related && content.related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-slate-800 mb-4">📚 Konten Terkait</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.related.map((r: any) => (
              <Link key={r.id} href={r.type === 'QNA' ? `/qna/${r.slug}` : `/artikel/${r.slug}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-emerald-200 transition-all group">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{r.type === 'QNA' ? 'Tanya Jawab' : 'Artikel'}</span>
                <h3 className="font-bold text-slate-800 mt-2 group-hover:text-emerald-600 transition-colors line-clamp-2">{r.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
