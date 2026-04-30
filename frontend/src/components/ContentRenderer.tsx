"use client";

import { Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User } from "lucide-react";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";

interface ContentRendererProps {
  content: any;
  isPreview?: boolean;
}

export default function ContentRenderer({ content, isPreview = false }: ContentRendererProps) {
  const qna = content.qnaDetail;
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';

  // Build audio blocks for AudioPlayerWrapper
  const audioBlocks = qna ? [
    ...(qna.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
    ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
    ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
    ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
    ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
  ] : (content.articleDetail?.blocks || []);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-bold px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full">{content.type === 'QNA' ? 'Tanya Jawab' : content.type === 'PEMBELAJARAN' ? 'Pembelajaran' : 'Artikel'}</span>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{(content.ageGroups || []).join(', ')} tahun</span>
          {isPreview && <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-700 rounded-full animate-pulse">PREVIEW</span>}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3">{content.title}</h1>
        {content.description && <p className="text-slate-500 text-sm mb-3">{content.description}</p>}
        <div className="flex items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4" /> {authorName}</span>
          {content.tags && content.tags.length > 0 && (
            <div className="flex gap-1">
              {content.tags.map((t: any, i: number) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">#{typeof t === 'string' ? t : t.tag?.name || t.name || t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio Player */}
      <AudioPlayerWrapper blocks={audioBlocks} enableAudio={content.enableAudio} contentType={content.type} />

      {/* QNA Content */}
      {qna && (
        <div className="space-y-8">
          {/* Quick Answer */}
          {qna.answerQuick && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
              <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
              <p className="text-emerald-900 font-medium leading-relaxed">{qna.answerQuick}</p>
            </div>
          )}

          {/* Dialogs */}
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

          {/* Dalils */}
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

          {/* Analogies */}
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

          {/* Tips */}
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

          {/* Image & Video Blocks in QNA (from articleDetail if exists) */}
          {content.articleDetail?.blocks && (
            <>
              {(content.articleDetail.blocks as any[]).filter((b: any) => b.type === 'image' || b.type === 'video').map((block: any, i: number) => {
                if (block.type === 'image' && block.url) return <img key={`qna-media-${i}`} src={block.url} alt={block.caption || ''} className="rounded-2xl w-full border border-slate-200" />;
                if (block.type === 'video' && block.url) {
                  const ytMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
                  if (ytMatch) return <div key={`qna-media-${i}`} className="aspect-video rounded-2xl overflow-hidden"><iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen /></div>;
                  return <a key={`qna-media-${i}`} href={block.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 rounded-xl p-4 text-emerald-600 font-bold hover:underline">🎬 {block.caption || block.url}</a>;
                }
                return null;
              })}
            </>
          )}
        </div>
      )}

      {/* Article Content */}
      {content.articleDetail && (
        <div className="prose prose-slate max-w-none">
          {(content.articleDetail.blocks as any[])?.map((block: any, i: number) => {
            if (block.type === 'heading') return <h2 key={i} className="text-xl font-bold text-slate-800 mt-8 mb-3">{block.text}</h2>;
            if (block.type === 'paragraph') return <p key={i} className="text-slate-600 leading-relaxed mb-4">{block.text}</p>;
            if (block.type === 'quick_answer') return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Ringkasan</h3>
                <p className="text-emerald-900 font-medium">{block.text}</p>
              </div>
            );
            if (block.type === 'dalil') return (
              <blockquote key={i} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4 my-4">
                {block.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{block.arabic}</p>}
                <p className="text-slate-700 italic font-medium">&ldquo;{block.translation || block.text}&rdquo;</p>
                {block.source && <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">— {block.source}</cite>}
              </blockquote>
            );
            if (block.type === 'tip') return <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4 text-emerald-800 text-sm font-medium">💡 {block.text}</div>;
            if (block.type === 'dialog') {
              const lines = block.lines || [{ role: block.role || 'anak', text: block.text || '' }];
              return (
                <div key={i} className="space-y-3 my-4">
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
            if (block.type === 'analogy') return (
              <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6 my-4">
                {block.title && <h3 className="font-bold text-teal-800 mb-2">{block.title}</h3>}
                <p className="text-teal-700 font-medium">{block.text}</p>
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
    </div>
  );
}
