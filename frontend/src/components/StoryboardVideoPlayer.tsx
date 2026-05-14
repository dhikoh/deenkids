"use client";

import { useState } from "react";
import { Film, Volume2, ChevronDown } from "lucide-react";

interface Props {
  storyboardVideoUrl: string; // YouTube embed URL
  audioUrl?: string | null;
  enableAudio?: boolean;
  title: string;
}

/**
 * Public page toggle: Video (YouTube embed) vs Audio player.
 * Shows a tabbed UI when both storyboard video and audio are available.
 * Falls back to video-only or audio-only when only one exists.
 */
export default function StoryboardVideoPlayer({ storyboardVideoUrl, audioUrl, enableAudio, title }: Props) {
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const hasAudio = enableAudio && audioUrl;

  // Extract YouTube video ID for embed
  const getYouTubeEmbedUrl = (url: string): string => {
    // Already an embed URL
    if (url.includes('/embed/')) return url;
    // Standard YouTube URL
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return url;
  };

  const embedUrl = getYouTubeEmbedUrl(storyboardVideoUrl);

  return (
    <div className="mb-6">
      {/* Tab toggle — only show when both video AND audio exist */}
      {hasAudio && (
        <div className="flex items-center gap-1 mb-3">
          <button
            onClick={() => setMode('video')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'video'
                ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Film className="h-4 w-4" /> Video
          </button>
          <button
            onClick={() => setMode('audio')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'audio'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Volume2 className="h-4 w-4" /> Audio
          </button>
        </div>
      )}

      {/* Video embed */}
      {mode === 'video' && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black border border-slate-200">
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
            loading="lazy"
          />
        </div>
      )}

      {/* Audio fallback — shown when user toggles to audio mode */}
      {mode === 'audio' && hasAudio && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5" /> Dengarkan Narasi
          </p>
          <audio controls className="w-full" preload="metadata">
            <source src={audioUrl} type="audio/mpeg" />
            Browser Anda tidak mendukung audio player.
          </audio>
        </div>
      )}
    </div>
  );
}
