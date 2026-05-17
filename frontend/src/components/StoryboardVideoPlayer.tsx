"use client";

import { useState, useMemo } from "react";
import { Film, Volume2 } from "lucide-react";

interface Props {
  storyboardVideoUrl: string; // YouTube URL or uploaded file path
  audioUrl?: string | null;
  enableAudio?: boolean;
  title: string;
}

/**
 * Public page toggle: Video vs Audio player.
 * Supports both YouTube embed URLs and direct file URLs (MP4/WebM).
 * Shows a tabbed UI when both video and audio are available.
 */
export default function StoryboardVideoPlayer({ storyboardVideoUrl, audioUrl, enableAudio, title }: Props) {
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const hasAudio = enableAudio && audioUrl;

  // Detect if URL is YouTube
  const isYouTube = useMemo(() => {
    return storyboardVideoUrl.includes('youtube.com') || storyboardVideoUrl.includes('youtu.be');
  }, [storyboardVideoUrl]);

  // Extract YouTube video ID for embed
  const youtubeEmbedUrl = useMemo(() => {
    if (!isYouTube) return '';
    if (storyboardVideoUrl.includes('/embed/')) return storyboardVideoUrl;
    const match = storyboardVideoUrl.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (match) return `https://www.youtube.com/embed/${match[1]}`;
    return storyboardVideoUrl;
  }, [storyboardVideoUrl, isYouTube]);

  // Resolve file URL (handle relative paths from MinIO)
  const fileVideoUrl = useMemo(() => {
    if (isYouTube) return '';
    if (storyboardVideoUrl.startsWith('http://') || storyboardVideoUrl.startsWith('https://')) {
      return storyboardVideoUrl;
    }
    // Relative path from backend storage
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '');
    return `${base}${storyboardVideoUrl}`;
  }, [storyboardVideoUrl, isYouTube]);

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

      {/* Video — YouTube embed OR native player */}
      {mode === 'video' && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black border border-slate-200">
          {isYouTube ? (
            <iframe
              src={youtubeEmbedUrl}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full"
              loading="lazy"
            />
          ) : (
            <video
              controls
              className="w-full h-full"
              preload="metadata"
              playsInline
            >
              <source src={fileVideoUrl} />
              Browser Anda tidak mendukung video player.
            </video>
          )}
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
