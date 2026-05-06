"use client";

import { Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User, Sparkles } from "lucide-react";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";

interface ContentRendererProps {
  content: any;
  isPreview?: boolean;
}

export default function ContentRenderer({ content, isPreview = false }: ContentRendererProps) {
  const qna = content.qnaDetail;
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';

  // Build audio blocks for AudioPlayerWrapper (respecting audioTitle, audioDescription, and per-block enableAudio)
  const titleDescBlocks = [
    ...(content.audioTitle !== false && content.title ? [{ type: 'paragraph', text: content.title, enableAudio: true }] : []),
    ...(content.audioDescription !== false && content.description ? [{ type: 'paragraph', text: content.description, enableAudio: true }] : []),
  ];
  const audioBlocks = [
    ...titleDescBlocks,
    ...(qna ? [
      ...(qna.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
      ...(Array.isArray(qna.blocks) && qna.blocks.length > 0 ? qna.blocks : [
        ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
        ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
        ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
        ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
      ]),
    ] : (content.articleDetail?.blocks || [])),
  ];

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

      {/* Audio Player — uploaded MP3 takes priority over browser TTS */}
      {content.audioUrl ? (
        <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 mb-6 border border-purple-100 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-purple-700">
            <span>🎙️</span>
            <span>Dengarkan Narasi Audio</span>
          </div>
          <audio
            controls
            src={`${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace('/api', '')}${content.audioUrl}`}
            className="w-full"
            style={{ height: '40px' }}
          />
          <p className="text-xs text-purple-400">Narasi AI — dengarkan konten ini tanpa harus membaca</p>
        </div>
      ) : (
        <AudioPlayerWrapper blocks={audioBlocks} enableAudio={content.enableAudio} contentType={content.type} />
      )}

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
            <div className="bg-sky-50/50 border border-sky-100 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> Contoh Dialog</h2>
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

          {/* Dalils — legacy format */}
          {qna.dalilBlocks && qna.dalilBlocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><BookOpen className="h-5 w-5 text-amber-600" /> Dalil &amp; Landasan</h2>
              <div className="space-y-4">
                {(qna.dalilBlocks as any[]).map((dalilBlock: any, i: number) => {
                  const entries = dalilBlock.entries || [dalilBlock];
                  return entries.map((dalil: any, j: number) => (
                    <blockquote key={`${i}-${j}`} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                      {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                      <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                      {dalil.source && <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">&mdash; {dalil.source}</cite>}
                      {dalil.sourceUrl && <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-semibold text-amber-600 hover:text-amber-800 underline">🔗 Lihat Sumber ↗</a>}
                    </blockquote>
                  ));
                })}
              </div>
            </div>
          )}

          {/* Analogies */}
          {qna.analogyBlocks && qna.analogyBlocks.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Quote className="h-5 w-5 text-teal-600" /> Analogi Sederhana</h2>
              {(qna.analogyBlocks as any[]).map((a: any, i: number) => (
                <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                  {a.title && <h3 className="font-bold text-teal-900 mb-1">{a.title}</h3>}
                  <p className="text-teal-700 font-medium">{a.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tips */}
          {qna.tipsBlocks && qna.tipsBlocks.length > 0 && (
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Lightbulb className="h-5 w-5 text-emerald-500" /> Catatan / Tips</h2>
              <ul className="space-y-2">
                {(qna.tipsBlocks as any[]).map((tip: any, i: number) => (
                  <li key={i} className="text-sm text-slate-600 font-medium flex gap-2">
                    <span className="text-emerald-500 font-bold">•</span> {tip.text}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unified blocks[] for QNA — new format: renders ALL block types */}
          {Array.isArray(qna.blocks) && qna.blocks.length > 0 && (
            <div className="space-y-6">
              {(qna.blocks as any[]).map((block: any, i: number) => {
                if (block.type === 'dalil') {
                  const entries = block.entries || [block];
                  return (
                    <div key={i} className="space-y-3">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2"><BookOpen className="h-5 w-5 text-amber-600" /> Dalil &amp; Landasan</h3>
                      {entries.map((dalil: any, j: number) => (
                        <blockquote key={j} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                          {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                          <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                          {dalil.source && <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">&mdash; {dalil.source}</cite>}
                          {dalil.sourceUrl && <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-semibold text-amber-600 hover:text-amber-800 underline">🔗 Lihat Sumber ↗</a>}
                        </blockquote>
                      ))}
                    </div>
                  );
                }
                if (block.type === 'dialog') {
                  const lines = block.lines || [{ role: block.role || 'anak', text: block.text || '' }];
                  return (
                    <div key={i} className="bg-sky-50/50 border border-sky-100 rounded-2xl p-6">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-emerald-600" /> Contoh Dialog</h3>
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
                if (block.type === 'analogy') return (
                  <div key={i} className="bg-teal-50 border border-teal-200 rounded-2xl p-6">
                    <h3 className="font-bold text-teal-800 mb-2 flex items-center gap-2"><Quote className="h-4 w-4" /> Analogi Sederhana</h3>
                    {block.title && <p className="font-bold text-teal-900 mb-1">{block.title}</p>}
                    <p className="text-teal-700 font-medium">{block.text}</p>
                  </div>
                );
                if (block.type === 'tip') return (
                  <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-emerald-500" /> Catatan / Tips</h3>
                    <p className="text-sm text-slate-600 font-medium">{block.text}{block.referenceUrl && <> &mdash; <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs hover:text-slate-800">Sumber ↗</a></>}</p>
                  </div>
                );
                if (block.type === 'hikmah') return (
                  <div key={i} className="bg-violet-50 border border-violet-200 rounded-2xl p-6">
                    <h3 className="font-bold text-violet-800 mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Hikmah &amp; Pelajaran</h3>
                    <p className="text-violet-700 font-medium leading-relaxed">{block.text}</p>
                  </div>
                );
                if (block.type === 'doa') return (
                  <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6">
                    <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">🤲 Doa</h3>
                    {block.title && <p className="font-bold text-indigo-900 mb-2">{block.title}</p>}
                    {block.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{block.arabic}</p>}
                    <p className="text-indigo-700 italic font-medium">&ldquo;{block.translation}&rdquo;</p>
                    {block.source && <cite className="block mt-2 text-sm font-bold text-indigo-600 not-italic">&mdash; {block.source}</cite>}
                    {block.sourceUrl && <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 underline">🔗 Lihat Sumber ↗</a>}
                  </div>
                );
                if (block.type === 'paragraph') return (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line">{block.text}</p>
                    {block.referenceUrl && <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}
                  </div>
                );
                return null;
              })}
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
            if (block.type === 'paragraph') return <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-4"><p className="text-slate-600 leading-relaxed whitespace-pre-line">{block.text}</p></div>;
            if (block.type === 'quick_answer') return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 my-4">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Ringkasan</h3>
                <p className="text-emerald-900 font-medium">{block.text}</p>
              </div>
            );
            if (block.type === 'dalil') {
              const entries = block.entries || [block];
              return (
                <div key={i} className="space-y-3 my-4">
                  <h3 className="font-bold text-amber-800 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Dalil &amp; Landasan</h3>
                  {entries.map((dalil: any, j: number) => (
                    <blockquote key={j} className="border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4">
                      {dalil.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{dalil.arabic}</p>}
                      <p className="text-slate-700 italic font-medium">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
                      {dalil.source && <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">&mdash; {dalil.source}</cite>}
                      {dalil.sourceUrl && <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-semibold text-amber-600 hover:text-amber-800 underline">🔗 Lihat Sumber ↗</a>}
                    </blockquote>
                  ))}
                </div>
              );
            }
            if (block.type === 'tip') return (
              <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4">
                <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Catatan / Tips</h3>
                <p className="text-emerald-800 text-sm font-medium">{block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs hover:text-emerald-900">Sumber ↗</a></>}</p>
              </div>
            );
            if (block.type === 'dialog') {
              const lines = block.lines || [{ role: block.role || 'anak', text: block.text || '' }];
              return (
                <div key={i} className="space-y-3 my-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Dialog</h3>
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
                {block.source && <cite className="block mt-2 text-sm font-bold text-indigo-600 not-italic">&mdash; {block.source}</cite>}
                {block.sourceUrl && <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 underline">🔗 Lihat Sumber ↗</a>}
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
