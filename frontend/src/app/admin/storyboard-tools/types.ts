export interface SlideItem {
  id: string;
  imageId: string;
  filename: string;
  objectUrl: string;
  duration: number;
  transition: string;
  transitionDuration: number;
  subtitle: string;
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
