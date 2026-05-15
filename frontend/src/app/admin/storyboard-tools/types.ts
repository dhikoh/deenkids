export type MediaType = 'image' | 'video';

export interface SlideItem {
  id: string;
  /** Server-side file ID (for both images and videos) */
  imageId: string;
  filename: string;
  objectUrl: string;
  duration: number;
  transition: string;
  transitionDuration: number;
  subtitle: string;
  /** Slide media type — image (default) or video clip */
  mediaType: MediaType;
  /** Original video duration in seconds (only for video slides) */
  videoDuration?: number;
  /** Thumbnail objectUrl for video slides (extracted from first frame) */
  videoThumbnailUrl?: string;
}

export interface AudioItem {
  id: string;
  filename: string;
  objectUrl: string;
  duration?: number;
}

export interface SubtitleConfig {
  enabled: boolean;
  font: string;
  fontSize: 'small' | 'medium' | 'large';
  color: string;
  position: 'top' | 'center' | 'bottom';
  bgStyle: 'semi-transparent' | 'none' | 'blur';
}

export const TRANSITIONS = [
  { id: 'fade', name: 'Fade' },
  { id: 'slideright', name: 'Slide Right' },
  { id: 'slideleft', name: 'Slide Left' },
  { id: 'slideup', name: 'Slide Up' },
  { id: 'slidedown', name: 'Slide Down' },
  { id: 'wipeleft', name: 'Wipe Left' },
  { id: 'wiperight', name: 'Wipe Right' },
  { id: 'dissolve', name: 'Dissolve' },
  { id: 'pixelize', name: 'Pixelize' },
  { id: 'zoomin', name: 'Zoom In' },
  { id: 'none', name: 'Tanpa Transisi' },
];

export const FONTS = [
  { id: 'montserrat', name: 'Montserrat Bold', style: 'Modern' },
  { id: 'poppins', name: 'Poppins SemiBold', style: 'Friendly' },
  { id: 'bebas-neue', name: 'Bebas Neue', style: 'Tegas' },
  { id: 'playfair', name: 'Playfair Display', style: 'Elegant' },
  { id: 'fredoka', name: 'Fredoka One', style: 'Playful' },
  { id: 'righteous', name: 'Righteous', style: 'Retro' },
  { id: 'baloo', name: 'Baloo 2', style: 'Fun' },
  { id: 'amiri', name: 'Amiri', style: 'Islami' },
];

export const FPS_OPTIONS = [30, 60, 120];

export const ASPECT_RATIOS = [
  { id: '16:9', name: '16:9 Landscape', desc: 'YouTube' },
  { id: '9:16', name: '9:16 Portrait', desc: 'Reels/TikTok' },
  { id: '1:1', name: '1:1 Square', desc: 'Instagram Feed' },
];

/** Allowed MIME types for media upload */
export const ACCEPTED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ACCEPTED_VIDEO_MIMES = ['video/mp4', 'video/webm'];
export const ACCEPTED_MEDIA_TYPES = [...ACCEPTED_IMAGE_MIMES, ...ACCEPTED_VIDEO_MIMES].join(',');
