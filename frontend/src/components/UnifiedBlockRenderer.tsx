"use client";

import { BookOpen, Lightbulb, Quote, MessageCircle, Sparkles } from "lucide-react";
import { ROLE_CONFIG } from "@/components/DialogIcons";

/**
 * UnifiedBlockRenderer — satu komponen shared yang merender blok konten
 * dengan styling sesuai variant halaman (QNA, Artikel, Kisah).
 *
 * Digunakan oleh:
 * - ContentRenderer (Preview)
 * - qna/[slug]/page.tsx (Halaman publik QNA)
 * - artikel/[slug]/page.tsx (Halaman publik Artikel)
 * - kisah/[nodeSlug]/[storySlug]/page.tsx (Halaman publik Kisah)
 *
 * Variant menentukan perbedaan styling kecil antar tipe konten.
 */

export type BlockVariant = "qna" | "artikel" | "kisah";

interface UnifiedBlockRendererProps {
  blocks: any[];
  variant: BlockVariant;
}

// ─── VARIANT-SPECIFIC STYLING ────────────────────────────────────────────────
const VARIANT_STYLES = {
  heading: {
    qna: "text-xl font-bold text-slate-800 mt-8 mb-3",
    artikel: "text-xl font-bold text-slate-800 mt-8 mb-3",
    kisah: "text-2xl font-extrabold text-slate-800 mt-10 mb-4 border-b border-amber-100 pb-2",
  },
  paragraph: {
    qna: "text-slate-700 leading-relaxed whitespace-pre-line",
    artikel: "text-slate-600 leading-relaxed whitespace-pre-line",
    kisah: "text-slate-700 leading-[1.9] text-base whitespace-pre-line",
  },
  paragraphContainer: {
    qna: "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm",
    artikel: "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-4",
    kisah: "bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-5",
  },
  analogy: {
    qna: "bg-teal-50 border border-teal-200 rounded-2xl p-6",
    artikel: "bg-teal-50 border border-teal-200 rounded-2xl p-6 my-4",
    kisah: "bg-orange-50 border border-orange-200 rounded-2xl p-5 my-5",
  },
  analogyTitle: {
    qna: "font-bold text-teal-800 mb-2 flex items-center gap-2",
    artikel: "font-bold text-teal-800 mb-2 flex items-center gap-2",
    kisah: "text-xs font-bold text-orange-500 uppercase tracking-wider mb-2",
  },
  analogyText: {
    qna: "text-teal-700 font-medium",
    artikel: "text-teal-700 font-medium",
    kisah: "text-orange-900 font-medium leading-relaxed",
  },
  tip: {
    qna: "bg-slate-50 rounded-2xl p-5 border border-slate-200",
    artikel: "bg-emerald-50 border border-emerald-200 rounded-xl p-4 my-4",
    kisah: "bg-emerald-50 border border-emerald-200 rounded-2xl p-5 my-5 flex gap-3",
  },
  dalilBlockquote: {
    qna: "border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4",
    artikel: "border-l-4 border-amber-400 bg-amber-50 rounded-r-xl px-6 py-4",
    kisah: "border-l-4 border-amber-400 bg-amber-50 rounded-r-2xl px-6 py-5 shadow-sm",
  },
  dalilArabic: {
    qna: "text-right text-lg font-serif text-slate-800 mb-2",
    artikel: "text-right text-lg font-serif text-slate-800 mb-2",
    kisah: "text-right text-xl font-serif text-slate-800 mb-3 leading-loose",
  },
  dialog: {
    qna: "bg-sky-50/50 border border-sky-100 rounded-2xl p-6",
    artikel: "space-y-3 my-4 bg-slate-50 rounded-2xl p-4 border border-slate-200",
    kisah: "", // Kisah does not use dialog format
  },
} as const;

// ─── RENDER FUNCTIONS ────────────────────────────────────────────────────────

function renderParagraph(block: any, i: number, variant: BlockVariant) {
  return (
    <div key={i} className={VARIANT_STYLES.paragraphContainer[variant]}>
      {/* Heading merged from (heading) marker — visual only, NOT read by TTS */}
      {block.heading && (
        <h3 className={VARIANT_STYLES.heading[variant]}>{block.heading}</h3>
      )}
      <p className={VARIANT_STYLES.paragraph[variant]}>{block.text}</p>
      {block.referenceUrl && (
        <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">
          📎 Sumber referensi ↗
        </a>
      )}
    </div>
  );
}

function renderHeading(block: any, i: number, variant: BlockVariant) {
  return <h2 key={i} className={VARIANT_STYLES.heading[variant]}>{block.text}</h2>;
}

function renderQuickAnswer(block: any, i: number) {
  return (
    <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
      <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-5 w-5" /> Jawaban Ringkas</h3>
      <p className="text-emerald-900 font-medium leading-relaxed">{block.text}</p>
      {block.referenceUrl && <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline hover:text-emerald-800 mt-2 inline-block">📎 Sumber referensi ↗</a>}
    </div>
  );
}

function renderDialog(block: any, i: number, variant: BlockVariant) {
  // Kisah does not use dialog format — skip
  if (variant === "kisah") return null;

  const lines = block.lines || [{ role: block.role || "anak", text: block.text || "" }];
  return (
    <div key={i} className={VARIANT_STYLES.dialog[variant]}>
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

function renderDalil(block: any, i: number, variant: BlockVariant) {
  const entries = block.entries || [{ arabic: block.arabic, translation: block.translation, source: block.source, sourceUrl: block.sourceUrl }];
  return (
    <div key={i} className={`space-y-3 ${variant !== "qna" ? "my-4" : ""}`}>
      <h3 className="font-bold text-amber-800 flex items-center gap-2"><BookOpen className="h-5 w-5" /> Dalil &amp; Landasan</h3>
      {entries.map((dalil: any, j: number) => (
        <blockquote key={j} className={VARIANT_STYLES.dalilBlockquote[variant]}>
          {dalil.arabic && <p className={VARIANT_STYLES.dalilArabic[variant]} dir="rtl">{dalil.arabic}</p>}
          <p className="text-slate-700 italic font-medium leading-relaxed">&ldquo;{dalil.translation || dalil.text}&rdquo;</p>
          <cite className="block mt-2 text-sm font-bold text-amber-700 not-italic">
            — {dalil.sourceUrl ? <a href={dalil.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900 transition-colors">{dalil.source} ↗</a> : dalil.source}
          </cite>
        </blockquote>
      ))}
    </div>
  );
}

function renderAnalogy(block: any, i: number, variant: BlockVariant) {
  return (
    <div key={i} className={VARIANT_STYLES.analogy[variant]}>
      {variant === "kisah" ? (
        <>
          <p className={VARIANT_STYLES.analogyTitle[variant]}>✨ Perumpamaan</p>
          {block.title && <p className="font-bold text-orange-800 mb-1">{block.title}</p>}
          <p className={VARIANT_STYLES.analogyText[variant]}>{block.text}</p>
          {block.explanation && <p className="text-sm text-orange-700 mt-2 italic">{block.explanation}</p>}
        </>
      ) : (
        <>
          <h3 className={VARIANT_STYLES.analogyTitle[variant]}><Quote className="h-4 w-4" /> Analogi Sederhana</h3>
          {block.title && <p className="font-bold text-teal-900 mb-1">{block.title}</p>}
          <p className={VARIANT_STYLES.analogyText[variant]}>{block.text}</p>
        </>
      )}
    </div>
  );
}

function renderTip(block: any, i: number, variant: BlockVariant) {
  if (variant === "kisah") {
    return (
      <div key={i} className={VARIANT_STYLES.tip[variant]}>
        <Lightbulb className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-800 font-semibold text-sm leading-relaxed">{block.text}</p>
          {block.referenceUrl && (
            <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline mt-1 inline-block hover:text-emerald-800">Sumber ↗</a>
          )}
        </div>
      </div>
    );
  }

  if (variant === "artikel") {
    return (
      <div key={i} className={VARIANT_STYLES.tip[variant]}>
        <h3 className="font-bold text-emerald-800 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4" /> Catatan / Tips</h3>
        <p className="text-emerald-800 text-sm font-medium">{block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="underline text-xs hover:text-emerald-900">Sumber ↗</a></>}</p>
      </div>
    );
  }

  // QNA variant
  return (
    <div key={i} className={VARIANT_STYLES.tip[variant]}>
      <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-emerald-500" /> Catatan / Tips</h3>
      <p className="text-sm text-slate-600 font-medium">{block.text}{block.referenceUrl && <> — <a href={block.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline hover:text-emerald-800 text-xs">Sumber ↗</a></>}</p>
    </div>
  );
}

function renderHikmah(block: any, i: number) {
  return (
    <div key={i} className="bg-violet-50 border border-violet-200 rounded-2xl p-6 my-4">
      <h3 className="font-bold text-violet-800 mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Hikmah &amp; Pelajaran</h3>
      <p className="text-violet-700 font-medium leading-relaxed whitespace-pre-line">{block.text}</p>
    </div>
  );
}

function renderDoa(block: any, i: number) {
  return (
    <div key={i} className="bg-indigo-50 border border-indigo-200 rounded-2xl p-6 my-4">
      <h3 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">🤲 Doa</h3>
      {block.title && <p className="font-bold text-indigo-900 mb-2">{block.title}</p>}
      {block.arabic && <p className="text-right text-lg font-serif text-slate-800 mb-2" dir="rtl">{block.arabic}</p>}
      {block.translation && <p className="text-indigo-700 italic font-medium">&ldquo;{block.translation}&rdquo;</p>}
      {block.source && (
        <cite className="block mt-2 text-sm font-bold text-indigo-600 not-italic">
          — {block.sourceUrl ? <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-800 transition-colors">{block.source} ↗</a> : block.source}
        </cite>
      )}
    </div>
  );
}

function renderImage(block: any, i: number) {
  if (!block.url) return null;
  return (
    <figure key={i} className="my-4">
      <img src={block.url} alt={block.caption || ""} className="rounded-2xl w-full border border-slate-200" />
      {block.caption && <figcaption className="text-xs text-slate-400 text-center mt-2">{block.caption}</figcaption>}
    </figure>
  );
}

function renderVideo(block: any, i: number) {
  if (!block.url) return null;
  const ytMatch = block.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (ytMatch) {
    return (
      <figure key={i} className="my-4">
        <div className="aspect-video rounded-2xl overflow-hidden">
          <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen />
        </div>
        {block.caption && <figcaption className="text-xs text-slate-400 text-center mt-2">{block.caption}</figcaption>}
      </figure>
    );
  }
  return (
    <a key={i} href={block.url} target="_blank" rel="noopener noreferrer" className="block bg-slate-100 rounded-xl p-4 my-4 text-emerald-600 font-bold hover:underline">
      🎬 {block.caption || block.url}
    </a>
  );
}

function renderQuote(block: any, i: number) {
  return (
    <blockquote key={i} className="border-l-4 border-slate-300 pl-5 my-5 text-slate-600 italic">
      <Quote className="h-4 w-4 text-slate-400 mb-1" />
      <p className="leading-relaxed font-medium">{block.text}</p>
      {block.source && <cite className="block mt-2 text-xs font-bold text-slate-500 not-italic">— {block.source}</cite>}
    </blockquote>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function UnifiedBlockRenderer({ blocks, variant }: UnifiedBlockRendererProps) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className={`space-y-6 ${variant === "artikel" || variant === "kisah" ? "prose prose-slate max-w-none" : ""}`}>
      {blocks.map((block: any, i: number) => {
        switch (block.type) {
          case "heading": return renderHeading(block, i, variant);
          case "paragraph": return renderParagraph(block, i, variant);
          case "quick_answer": return renderQuickAnswer(block, i);
          case "dialog": return renderDialog(block, i, variant);
          case "dalil": return renderDalil(block, i, variant);
          case "analogy": return renderAnalogy(block, i, variant);
          case "tip": return renderTip(block, i, variant);
          case "hikmah": return renderHikmah(block, i);
          case "doa": return renderDoa(block, i);
          case "image": return renderImage(block, i);
          case "video": return renderVideo(block, i);
          case "quote": return renderQuote(block, i);
          default: return null;
        }
      })}
    </div>
  );
}
