"use client";

import Link from "next/link";
import { Eye, Headphones, BookOpen } from "lucide-react";

interface BacaJugaItem {
  id: string;
  title: string;
  slug: string;
  type: string;
  viewCount?: number;
  thumbnailUrl?: string;
  enableAudio?: boolean;
  description?: string;
  node?: { slug: string };
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  QNA: { label: "Tanya Jawab", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  ARTIKEL: { label: "Artikel", color: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200" },
  KISAH: { label: "Kisah Islami", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  PEMBELAJARAN: { label: "Pembelajaran", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

function getContentHref(item: BacaJugaItem): string {
  switch (item.type) {
    case "QNA": return `/qna/${item.slug}`;
    case "ARTIKEL": return `/artikel/${item.slug}`;
    case "KISAH": return `/kisah/${item.node?.slug || "kisah"}/${item.slug}`;
    case "PEMBELAJARAN": return `/pembelajaran/${item.slug}`;
    default: return `/artikel/${item.slug}`;
  }
}

export default function BacaJuga({ items }: { items?: BacaJugaItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="mt-8 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-emerald-500" />
        Baca Juga
      </h3>
      <div className="space-y-3">
        {items.map((item) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.ARTIKEL;
          return (
            <Link
              key={item.id}
              href={getContentHref(item)}
              className="group flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all"
            >
              {/* Thumbnail */}
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                  <BookOpen className="h-6 w-6 text-slate-400" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${config.bg} ${config.color} ${config.border} border`}>
                    {config.label}
                  </span>
                  {item.enableAudio && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 flex items-center gap-0.5">
                      <Headphones className="h-2.5 w-2.5" /> Audio
                    </span>
                  )}
                </div>
                <p className="font-bold text-sm text-slate-700 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                  {item.title}
                </p>
                {item.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                )}
                {item.viewCount != null && item.viewCount > 0 && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                    <Eye className="h-3 w-3" /> {item.viewCount.toLocaleString("id-ID")}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
