"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { SlideItem, SubtitleConfig } from "./types";

interface AudioInfo {
  filename: string;
  objectUrl: string;
}

interface Props {
  slides: SlideItem[];
  activeSlide: number;
  aspectRatio: string;
  subtitleConfig: SubtitleConfig;
  audio: AudioInfo | null;
  onSlideChange: (i: number) => void;
}

interface SlideTimecode {
  slideIndex: number;
  startTime: number;
  endTime: number;
  transitionStart: number; // when transition OUT begins
}

export default function StoryboardPreview({
  slides, activeSlide, aspectRatio, subtitleConfig, audio, onSlideChange,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(0); // 0-1 during transition
  const [isTransitioning, setIsTransitioning] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);

  // Build timecode map
  const timecodes: SlideTimecode[] = [];
  let accTime = 0;
  for (let i = 0; i < slides.length; i++) {
    const dur = slides[i].duration;
    const transDur = slides[i].transitionDuration || 0.8;
    const start = accTime;
    const end = accTime + dur;
    const transitionStart = end - transDur;
    timecodes.push({ slideIndex: i, startTime: start, endTime: end, transitionStart });
    // Next slide starts when transition begins (overlap)
    if (i < slides.length - 1) {
      accTime += dur - transDur;
    } else {
      accTime += dur;
    }
  }
  const totalDuration = accTime;

  // Find which slide is active at a given time
  const getSlideAtTime = useCallback((t: number): { primary: number; secondary: number; progress: number } => {
    for (let i = 0; i < timecodes.length; i++) {
      const tc = timecodes[i];
      if (t >= tc.startTime && t < tc.endTime) {
        // Check if in transition zone
        if (t >= tc.transitionStart && i < timecodes.length - 1) {
          const transDur = slides[i].transitionDuration || 0.8;
          const progress = (t - tc.transitionStart) / transDur;
          return { primary: i, secondary: i + 1, progress: Math.min(1, progress) };
        }
        return { primary: i, secondary: -1, progress: 0 };
      }
    }
    return { primary: slides.length - 1, secondary: -1, progress: 0 };
  }, [timecodes, slides]);

  // Animation loop
  const animate = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    const t = elapsed;

    if (t >= totalDuration) {
      setPlaying(false);
      setCurrentTime(totalDuration);
      setIsTransitioning(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }

    setCurrentTime(t);

    const { primary, secondary, progress } = getSlideAtTime(t);
    setCurrentSlideIdx(primary);
    setIsTransitioning(secondary >= 0);
    setTransitionProgress(progress);

    if (primary !== activeSlide) {
      onSlideChange(primary);
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [totalDuration, getSlideAtTime, activeSlide, onSlideChange]);

  // Play/pause
  const togglePlay = () => {
    if (slides.length === 0) return;

    if (playing) {
      // Pause
      setPlaying(false);
      pauseTimeRef.current = currentTime;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.pause();
    } else {
      // Play
      setPlaying(true);
      const resumeFrom = currentTime >= totalDuration ? 0 : currentTime;
      if (resumeFrom === 0) setCurrentTime(0);
      startTimeRef.current = performance.now() - resumeFrom * 1000;

      if (audioRef.current) {
        audioRef.current.currentTime = resumeFrom;
        audioRef.current.play().catch(() => {});
      }

      rafRef.current = requestAnimationFrame(animate);
    }
  };

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Restart animation when slides change while playing
  useEffect(() => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [animate, playing]);

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrentTime(t);
    startTimeRef.current = performance.now() - t * 1000;
    pauseTimeRef.current = t;

    const { primary } = getSlideAtTime(t);
    setCurrentSlideIdx(primary);
    onSlideChange(primary);

    if (audioRef.current) {
      audioRef.current.currentTime = t;
    }
  };

  // Skip to next/prev slide
  const skipTo = (dir: -1 | 1) => {
    const newIdx = Math.max(0, Math.min(slides.length - 1, currentSlideIdx + dir));
    const tc = timecodes[newIdx];
    if (tc) {
      const t = tc.startTime;
      setCurrentTime(t);
      setCurrentSlideIdx(newIdx);
      startTimeRef.current = performance.now() - t * 1000;
      onSlideChange(newIdx);
      if (audioRef.current) audioRef.current.currentTime = t;
    }
  };

  // Format time
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  // Get transition CSS
  const getTransitionStyle = (transition: string, progress: number, isOutgoing: boolean) => {
    const opacity = isOutgoing ? 1 - progress : progress;

    if (transition === "fade" || transition === "dissolve") {
      return { opacity };
    }
    if (transition === "slideright") {
      const x = isOutgoing ? -progress * 100 : (1 - progress) * 100;
      return { opacity: 1, transform: `translateX(${x}%)` };
    }
    if (transition === "slideleft") {
      const x = isOutgoing ? progress * 100 : -(1 - progress) * 100;
      return { opacity: 1, transform: `translateX(${x}%)` };
    }
    if (transition === "slideup") {
      const y = isOutgoing ? progress * 100 : -(1 - progress) * 100;
      return { opacity: 1, transform: `translateY(${y}%)` };
    }
    if (transition === "slidedown") {
      const y = isOutgoing ? -progress * 100 : (1 - progress) * 100;
      return { opacity: 1, transform: `translateY(${y}%)` };
    }
    if (transition === "zoomin") {
      const scale = isOutgoing ? 1 + progress * 0.3 : 0.7 + progress * 0.3;
      return { opacity, transform: `scale(${scale})` };
    }
    // Default fade
    return { opacity };
  };

  const currentSlide = slides[currentSlideIdx];
  const nextSlide = isTransitioning && currentSlideIdx + 1 < slides.length ? slides[currentSlideIdx + 1] : null;
  const transition = nextSlide?.transition || "fade";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-3 py-1.5 flex items-center justify-between">
        <p className="text-[10px] text-slate-400 font-medium">Preview</p>
        <p className="text-[10px] text-slate-500 font-mono">
          {slides.length > 0 && `Slide ${currentSlideIdx + 1}/${slides.length}`}
        </p>
      </div>

      {/* Video area */}
      <div
        className="bg-black flex items-center justify-center relative overflow-hidden"
        style={{
          aspectRatio: aspectRatio === "16:9" ? "16/9" : aspectRatio === "9:16" ? "9/16" : "1/1",
          maxHeight: "500px",
        }}
      >
        {slides.length > 0 && currentSlide ? (
          <>
            {/* Primary (current) slide */}
            <img
              src={currentSlide.objectUrl}
              alt={`Slide ${currentSlideIdx + 1}`}
              className="absolute inset-0 w-full h-full object-contain"
              style={isTransitioning ? getTransitionStyle(transition, transitionProgress, true) : { opacity: 1 }}
            />

            {/* Secondary (next) slide during transition */}
            {isTransitioning && nextSlide && (
              <img
                src={nextSlide.objectUrl}
                alt={`Slide ${currentSlideIdx + 2}`}
                className="absolute inset-0 w-full h-full object-contain"
                style={getTransitionStyle(transition, transitionProgress, false)}
              />
            )}

            {/* Subtitle overlay */}
            {subtitleConfig.enabled && currentSlide.subtitle && (
              <div className={`absolute left-0 right-0 text-center px-4 py-2 z-10 ${
                subtitleConfig.position === "top" ? "top-4" : subtitleConfig.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-4"
              }`}>
                <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                  subtitleConfig.bgStyle === "semi-transparent" ? "bg-black/50" : subtitleConfig.bgStyle === "blur" ? "bg-black/30 backdrop-blur-sm" : ""
                } ${
                  subtitleConfig.color === "white" ? "text-white" : subtitleConfig.color === "yellow" ? "text-yellow-400" : "text-black"
                }`}>
                  {currentSlide.subtitle}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-center p-8">
            <p className="text-sm font-bold">Belum ada slide</p>
            <p className="text-xs text-slate-600 mt-1">Tambahkan gambar di panel Timeline</p>
          </div>
        )}
      </div>

      {/* Controls */}
      {slides.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 space-y-2">
          {/* Timeline scrubber */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-slate-500 w-10 text-right">{fmt(currentTime)}</span>
            <div className="flex-1 relative">
              <input
                type="range"
                min={0}
                max={totalDuration || 1}
                step={0.05}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 accent-violet-500 cursor-pointer"
              />
              {/* Slide markers */}
              <div className="absolute top-3 left-0 right-0 flex">
                {timecodes.map((tc, i) => (
                  <div
                    key={i}
                    className="absolute h-1 rounded-full"
                    style={{
                      left: `${(tc.startTime / totalDuration) * 100}%`,
                      width: `${((tc.endTime - tc.startTime) / totalDuration) * 100}%`,
                      backgroundColor: i === currentSlideIdx ? "rgb(139, 92, 246)" : "rgb(203, 213, 225)",
                    }}
                  />
                ))}
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-500 w-10">{fmt(totalDuration)}</span>
          </div>

          {/* Playback buttons */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => skipTo(-1)}
              disabled={currentSlideIdx === 0}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 disabled:text-slate-300 transition-all"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-200 transition-all"
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={() => skipTo(1)}
              disabled={currentSlideIdx >= slides.length - 1}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 disabled:text-slate-300 transition-all"
            >
              <SkipForward size={16} />
            </button>

            {/* Volume toggle */}
            {audio && (
              <button
                onClick={() => {
                  setMuted(!muted);
                  if (audioRef.current) audioRef.current.muted = !muted;
                }}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-all ml-2"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden audio element */}
      {audio && (
        <audio ref={audioRef} src={audio.objectUrl} preload="auto" muted={muted} />
      )}
    </div>
  );
}
