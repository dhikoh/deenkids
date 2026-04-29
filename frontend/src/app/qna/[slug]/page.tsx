import { fetchContentBySlug } from "@/lib/api";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User } from "lucide-react";
import { EngagementBar } from "@/components/ui/EngagementBar";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";

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
          <AudioPlayerWrapper blocks={[
            ...(qna.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
            ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
            ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
            ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
            ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
          ]} enableAudio={content.enableAudio} contentType={content.type} />
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
            <p className="text-emerald-900 font-medium leading-relaxed">{qna.answerQuick}</p>
          </div>

          {qna.dialogBlocks && qna.dialogBlocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Contoh Dialog</h2>
              <div className="space-y-3">
                {(qna.dialogBlocks as any[]).map((block: any, i: number) => {
                  const lines = block.lines || [{ role: block.role || 'anak', text: block.text || '' }];
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

          {qna.dalilBlocks && qna.dalilBlocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-amber-600" /> Dalil & Sumber</h2>
              <div className="space-y-4">
                {(qna.dalilBlocks as any[]).map((dalilBlock: any, i: number) => {
                  const entries = dalilBlock.entries || [dalilBlock];
                  return entries.map((dalil: any, j: number) => (
                    <blockquote key={`${i}-${j}`} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                      {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                      <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                      <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">— {dalil.source}</cite>
                    </blockquote>
                  ));
                })}
              </div>
            </div>
          )}

          {qna.analogyBlocks && qna.analogyBlocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Quote className="h-5 w-5 text-teal-600" /> Analogi untuk Anak</h2>
              {(qna.analogyBlocks as any[]).map((a: any, i: number) => (
                <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                  <h3 className="font-bold text-teal-800 mb-2">{a.title}</h3>
                  <p className="text-teal-700 font-medium">{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {qna.tipsBlocks && qna.tipsBlocks.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-3">💡 Tips untuk Orang Tua</h2>
              <ul className="space-y-2">
                {(qna.tipsBlocks as any[]).map((tip: any, i: number) => (
                  <li key={i} className="text-sm text-slate-600 font-medium flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span> {tip.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {content.articleDetail && (
        <div className="prose prose-slate max-w-none">
          {(content.articleDetail.blocks as any[])?.map((block: any, i: number) => {
            if (block.type === 'heading') return <h2 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-3">{block.text}</h2>;
            if (block.type === 'paragraph') return <p key={i} className="text-slate-600 leading-relaxed mb-4">{block.text}</p>;
            if (block.type === 'dalil') return <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4 my-4 italic text-slate-700">{block.text}</blockquote>;
            if (block.type === 'tip') return <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4 text-emerald-800 text-sm font-medium">💡 {block.text}</div>;
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
              <Link key={r.id} href={`/qna/${r.slug}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-emerald-200 transition-all group">
                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{r.type}</span>
                <h3 className="font-bold text-slate-800 mt-2 group-hover:text-emerald-600 transition-colors line-clamp-2">{r.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
