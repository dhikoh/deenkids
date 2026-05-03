import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const content = await fetchContentBySlug(slug);
    return {
      title: content.title,
      description: content.description || content.title,
      openGraph: {
        title: content.title,
        description: content.description || content.title,
        type: "article",
        images: [{ url: content.thumbnailUrl || "/og-image.png", width: 1200, height: 630 }],
      },
      twitter: { card: "summary_large_image", title: content.title, description: content.description || "" },
    };
  } catch {
    return { title: "Konten" };
  }
}

export default async function QnaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let content: any;
  try {
    content = await fetchContentBySlug(slug);
  } catch {
    notFound();
  }

  const qna = content.qnaDetail;
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 pt-28 max-w-3xl">
      <Link href={content.type === 'QNA' ? '/qna' : '/artikel'} className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8 font-bold text-sm">
        <ChevronLeft className="h-4 w-4 mr-1" /> Kembali
      </Link>

      <div className="mb-8">
        {content.thumbnailUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">{content.type === 'QNA' ? 'Tanya Jawab' : 'Artikel'}</span>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{(content.ageGroups || []).join(', ')} tahun</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3">{content.title}</h1>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4" /> {authorName}</span>
          {content.avgRating > 0 && <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="h-4 w-4 fill-amber-500" /> {content.avgRating.toFixed(1)}</span>}
          <span className="flex items-center gap-1"><ThumbsUp className="h-4 w-4" /> {content.likeCount}</span>
          <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {content.viewCount}</span>
        </div>
      </div>

      {qna && (
        <div className="space-y-8">
          {/* Audio Player — unified blocks for TTS */}
          <AudioPlayerWrapper blocks={[
            ...(qna.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
            ...((Array.isArray(qna.blocks) && qna.blocks.length > 0 ? qna.blocks : [
              ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
              ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
              ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
              ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
            ]) as any[]),
          ]} enableAudio={content.enableAudio} contentType={content.type} />

          {/* Quick Answer Card — always shown first */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
            <p className="text-emerald-900 font-medium leading-relaxed">{qna.answerQuick}</p>
            {qna.answerQuickReferenceUrl && <a href={qna.answerQuickReferenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}
          </div>

          {/* Universal Block Renderer — reads from qna.blocks[] (new) or legacy fields */}
          {(() => {
            const blockList: any[] = Array.isArray(qna.blocks) && qna.blocks.length > 0
              ? qna.blocks
              : [
                  ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
                  ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
                  ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
                  ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
                ];

            if (blockList.length === 0) return null;

            return (
              <div className="space-y-6">
                {blockList.map((block: any, i: number) => {
                  if (block.type === 'paragraph') return (
                    <div key={i}>
                      <p className="text-slate-700 leading-relaxed">{block.text}</p>
                      {block.referenceUrl && <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-1 inline-block">📎 Sumber referensi ↗</a>}
                    </div>
                  );

                  if (block.type === 'dialog') {
                    const lines = block.lines || [{ role: block.role || 'anak', text: block.text || '' }];
                    return (
                      <div key={i}>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-3"><MessageCircle className="h-3.5 w-3.5" /> Dialog</h3>
                        <div className="space-y-3">
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
                      </div>
                    );
                  }

                  if (block.type === 'dalil') {
                    const entries = block.entries || [block];
                    return (
                      <div key={i} className="space-y-3">
                        {entries.map((dalil: any, j: number) => (
                          <blockquote key={j} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                            {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                            <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                            <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">
                              — {dalil.sourceUrl ? <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 transition-colors">{dalil.source} ↗</a> : dalil.source}
                            </cite>
                          </blockquote>
                        ))}
                      </div>
                    );
                  }

                  if (block.type === 'analogy') return (
                    <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                      {block.title && <h3 className="font-bold text-teal-800 mb-2">{block.title}</h3>}
                      <p className="text-teal-700 font-medium">{block.text}</p>
                    </div>
                  );

                  if (block.type === 'tip') return (
                    <div key={i} className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                      <p className="text-sm text-slate-700 font-medium flex gap-2"><span className="text-emerald-500 font-bold">•</span><span>{block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-800 text-xs">Sumber ↗</a></>}</span></p>
                    </div>
                  );

                  if (block.type === 'image' && block.url) return (
                    <figure key={i}>
                      <img src={block.url} alt={block.caption || ''} className="rounded-2xl w-full border border-slate-200" />
                      {block.caption && <figcaption className="text-xs text-slate-400 text-center mt-2">{block.caption}</figcaption>}
                    </figure>
                  );

                  if (block.type === 'video' && block.url) {
                    const ytMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                    if (ytMatch) return (
                      <figure key={i}>
                        <div className="aspect-video rounded-2xl overflow-hidden"><iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen /></div>
                        {block.caption && <figcaption className="text-xs text-slate-400 text-center mt-2">{block.caption}</figcaption>}
                      </figure>
                    );
                    return <a key={i} href={block.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 rounded-xl p-4 text-emerald-600 font-bold hover:underline">🎬 {block.caption || block.url}</a>;
                  }

                  return null;
                })}
              </div>
            );
          })()}
        </div>
      )}

      {content.articleDetail && (
        <div className="prose prose-slate max-w-none">
          {(content.articleDetail.blocks as any[])?.map((block: any, i: number) => {
            if (block.type === 'heading') return <h2 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-3">{block.text}</h2>;
            if (block.type === 'paragraph') return <div key={i} className="mb-4"><p className="text-slate-600 leading-relaxed">{block.text}</p>{block.referenceUrl && <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800">📎 Sumber referensi ↗</a>}</div>;
            if (block.type === 'dalil') {
              const entries = block.entries || [block];
              return entries.map((d: any, j: number) => (
                <blockquote key={`${i}-${j}`} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4 my-4">
                  {d.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{d.arabic}</p>}
                  <p className="italic text-slate-700">&ldquo;{d.translation || d.text}&rdquo;</p>
                  <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">— {d.sourceUrl ? <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">{d.source} ↗</a> : d.source}</cite>
                </blockquote>
              ));
            }
            if (block.type === 'tip') return <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4 text-emerald-800 text-sm font-medium">💡 {block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs hover:text-emerald-900">Sumber ↗</a></>}</div>;
            if (block.type === 'dialog') return (
              <div key={i} className={`flex ${block.role === 'anak' ? 'justify-start' : 'justify-end'} my-2`}>
                <div className={`max-w-[80%] px-5 py-3 rounded-2xl text-sm font-medium ${block.role === 'anak' ? 'bg-slate-100 text-slate-700 rounded-bl-sm' : 'bg-emerald-500 text-white rounded-br-sm'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60">{block.role === 'anak' ? '👦 Anak' : '👩 Orang Tua'}</p>
                  {block.text}
                </div>
              </div>
            );
            if (block.type === 'analogy') return (
              <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6 my-4">
                {block.title && <h3 className="font-bold text-teal-800 mb-2">{block.title}</h3>}
                <p className="text-teal-700 font-medium">{block.text}</p>
              </div>
            );
            if (block.type === 'image' && block.url) return <img key={i} src={block.url} alt={block.caption || ''} className="rounded-2xl w-full my-4 border border-slate-200" />;
            if (block.type === 'video' && block.url) {
              // YouTube embed
              const ytMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
              if (ytMatch) return <div key={i} className="aspect-video rounded-2xl overflow-hidden my-4"><iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen /></div>;
              return <a key={i} href={block.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 rounded-xl p-4 my-4 text-emerald-600 font-bold hover:underline">🎬 {block.caption || block.url}</a>;
            }
            return null;
          })}
        </div>
      )}

      {/* Engagement Bar */}
      <EngagementBar
        contentId={content.id}
        initialLikes={content.likeCount || 0}
        initialBookmarks={content.bookmarkCount || 0}
        initialRating={content.avgRating || 0}
        initialShares={content.shareCount || 0}
        initialViews={content.viewCount || 0}
      />

      {/* Related Content */}
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
