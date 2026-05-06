/**
 * NarrationAudioPlayer — shared component for playing uploaded MP3 narrations.
 *
 * Used on:
 * - Public pages: /artikel/[slug], /kisah/[nodeSlug]/[storySlug], /qna/[slug]
 * - Admin preview: /admin/editor/preview
 * - ContentRenderer (legacy)
 *
 * Accepts a full MinIO URL (https://...) or a relative path (legacy).
 * Full URLs are used directly; relative paths get the API base prepended.
 */

interface NarrationAudioPlayerProps {
  audioUrl: string;
}

export default function NarrationAudioPlayer({ audioUrl }: NarrationAudioPlayerProps) {
  // Full MinIO URL → use directly. Relative (legacy) → prepend API base.
  const src =
    audioUrl.startsWith('http://') || audioUrl.startsWith('https://')
      ? audioUrl
      : `${(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/api$/, '')}${audioUrl}`;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-4 mb-6 border border-purple-100 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-bold text-purple-700">
        <span>🎙️</span>
        <span>Dengarkan Narasi Audio</span>
      </div>
      <audio controls src={src} className="w-full" style={{ height: '40px' }} />
      <p className="text-xs text-purple-400">
        Narasi AI — dengarkan konten ini tanpa harus membaca
      </p>
    </div>
  );
}
