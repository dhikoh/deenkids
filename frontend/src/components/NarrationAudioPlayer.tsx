"use client";

/**
 * NarrationAudioPlayer — shared component for playing uploaded MP3 narrations.
 *
 * Features:
 * - Plays MP3 from MinIO (full URL) or legacy relative paths
 * - Media Session API for lock-screen controls on mobile
 * - Displays title + artwork in notification bar when phone is locked
 *
 * Used on:
 * - Public pages: /artikel/[slug], /kisah/[nodeSlug]/[storySlug], /qna/[slug]
 * - Admin preview: /admin/editor/preview
 * - ContentRenderer
 */

import { useRef, useEffect } from "react";

interface NarrationAudioPlayerProps {
  audioUrl: string;
  title?: string;
  thumbnailUrl?: string;
}

export default function NarrationAudioPlayer({ audioUrl, title, thumbnailUrl }: NarrationAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Full MinIO URL → use directly. Relative (legacy) → prepend API base.
  const src =
    audioUrl.startsWith('http://') || audioUrl.startsWith('https://')
      ? audioUrl
      : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '')}${audioUrl}`;

  // Media Session API — enables lock-screen controls on mobile
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !('mediaSession' in navigator)) return;

    const handlePlay = () => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || 'Narasi Audio',
        artist: 'Adably',
        album: 'Konten Islami Anak',
        artwork: thumbnailUrl
          ? [{ src: thumbnailUrl, sizes: '512x512', type: 'image/png' }]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 10);
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
      });
    };

    audio.addEventListener('play', handlePlay);
    return () => audio.removeEventListener('play', handlePlay);
  }, [title, thumbnailUrl]);

  return (
    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 mb-6 border border-purple-100 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-bold text-purple-700">
        <span>🎙️</span>
        <span>Dengarkan Narasi Audio</span>
      </div>
      <audio ref={audioRef} controls src={src} className="w-full" style={{ height: '40px' }} />
      <p className="text-xs text-purple-400">
        Narasi audio — dengarkan konten ini tanpa harus membaca
      </p>
    </div>
  );
}
