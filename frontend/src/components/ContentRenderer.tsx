"use client";

import { Star, ThumbsUp, Eye, BookOpen, Lightbulb, Quote, MessageCircle, User, Sparkles } from "lucide-react";
import { ROLE_CONFIG } from "@/components/DialogIcons";
import AudioPlayerWrapper from "@/components/AudioPlayerWrapper";
import NarrationAudioPlayer from "@/components/NarrationAudioPlayer";
import UnifiedBlockRenderer, { type BlockVariant } from "@/components/UnifiedBlockRenderer";

interface ContentRendererProps {
  content: any;
  isPreview?: boolean;
}

/**
 * ContentRenderer — used by Preview page to show content exactly as it will appear
 * when published on the public pages. Uses UnifiedBlockRenderer (shared with public pages)
 * to ensure visual parity.
 */
export default function ContentRenderer({ content, isPreview = false }: ContentRendererProps) {
  const authorName = content.authorName || content.displayAuthorName || content.author?.name || 'Anonim';

  // Determine variant based on content type
  const variant: BlockVariant =
    content.type === 'QNA' ? 'qna' :
    content.type === 'KISAH' ? 'kisah' :
    'artikel'; // ARTIKEL + PEMBELAJARAN use artikel variant

  // Type label for badge
  const typeLabel =
    content.type === 'QNA' ? 'Tanya Jawab' :
    content.type === 'KISAH' ? 'Kisah' :
    content.type === 'PEMBELAJARAN' ? 'Pembelajaran' :
    'Artikel';

  // ── Build blocks list (single source — no duplication) ──
  // For QNA: use unified blocks[] if available, else fallback to legacy fields
  const qna = content.qnaDetail;
  let contentBlocks: any[] = [];

  if (content.type === 'QNA' && qna) {
    // Unified blocks[] format (new) — preferred
    if (Array.isArray(qna.blocks) && qna.blocks.length > 0) {
      contentBlocks = qna.blocks;
    } else {
      // Legacy fallback: compose from separate fields
      contentBlocks = [
        ...(qna.dialogBlocks || []).map((b: any) => ({ type: 'dialog', ...b })),
        ...(qna.dalilBlocks || []).map((b: any) => ({ type: 'dalil', ...b })),
        ...(qna.analogyBlocks || []).map((b: any) => ({ type: 'analogy', ...b })),
        ...(qna.tipsBlocks || []).map((b: any) => ({ type: 'tip', ...b })),
      ];
    }
  } else {
    // ARTIKEL, PEMBELAJARAN, KISAH — all use articleDetail.blocks
    contentBlocks = content.articleDetail?.blocks || [];
  }

  // Build audio blocks for AudioPlayerWrapper (respecting audioTitle, audioDescription, and per-block enableAudio)
  const audioBlocks = [
    ...(content.openingAudio !== false && content.openingText ? [{ type: 'paragraph', text: content.openingText, enableAudio: true }] : []),
    ...(content.audioTitle !== false && content.title ? [{ type: 'paragraph', text: content.title, enableAudio: true }] : []),
    ...(content.audioDescription !== false && content.description ? [{ type: 'paragraph', text: content.description, enableAudio: true }] : []),
    ...(qna?.answerQuick ? [{ type: 'quick_answer', text: qna.answerQuick }] : []),
    ...contentBlocks,
    ...(content.closingAudio !== false && content.closingText ? [{ type: 'paragraph', text: content.closingText, enableAudio: true }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        {/* Thumbnail — mirroring public pages */}
        {content.thumbnailUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden mb-6 shadow-md bg-slate-100">
            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-contain" />
          </div>
        )}

        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            content.type === 'QNA' ? 'bg-emerald-50 text-emerald-700' :
            content.type === 'KISAH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-sky-50 text-sky-700'
          }`}>{typeLabel}</span>
          {/* POV badge for Artikel */}
          {content.type === 'ARTICLE' && content.pov === 'ORTU' && <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-full">👨‍👩‍👧 Orang Tua</span>}
          {content.type === 'ARTICLE' && content.pov === 'ANAK' && <span className="text-xs font-bold px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">👦 Anak</span>}
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full">{(content.ageGroups || []).join(', ')} tahun</span>
          {isPreview && <span className="text-xs font-bold px-3 py-1 bg-amber-100 text-amber-700 rounded-full animate-pulse">PREVIEW</span>}
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 mb-3">{content.title}</h1>
        {content.description && <p className="text-slate-500 leading-relaxed mb-4 text-lg">{content.description}</p>}
        <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium"><User className="h-4 w-4" /> {authorName}</span>
          {content.tags && content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {content.tags.map((t: any, i: number) => (
                <span key={i} className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">#{typeof t === 'string' ? t : t.tag?.name || t.name || t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audio Player — enableAudio is master gate; MP3 takes priority over browser TTS */}
      {content.enableAudio && content.audioUrl ? (
        <NarrationAudioPlayer audioUrl={content.audioUrl} title={content.title} thumbnailUrl={content.thumbnailUrl} />
      ) : (
        <AudioPlayerWrapper blocks={audioBlocks} enableAudio={content.enableAudio} contentType={content.type} />
      )}

      {/* Opening / Mukadimah */}
      {content.openingText && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-6 mb-6">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🕌 Pembukaan</p>
          <p className="text-emerald-900 font-medium leading-relaxed whitespace-pre-line">{content.openingText}</p>
        </div>
      )}

      {/* Quick Answer — only for QNA, always shown first */}
      {content.type === 'QNA' && qna?.answerQuick && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
          <h2 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h2>
          <p className="text-emerald-900 font-medium leading-relaxed">{qna.answerQuick}</p>
          {qna.answerQuickReferenceUrl && <a href={qna.answerQuickReferenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}
        </div>
      )}

      {/* Content Blocks — unified rendering via UnifiedBlockRenderer */}
      <UnifiedBlockRenderer blocks={contentBlocks} variant={variant} />

      {/* Closing / Penutupan */}
      {content.closingText && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6 mt-6">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">🤲 Penutupan</p>
          <p className="text-amber-900 font-medium leading-relaxed whitespace-pre-line">{content.closingText}</p>
        </div>
      )}
    </div>
  );
}
