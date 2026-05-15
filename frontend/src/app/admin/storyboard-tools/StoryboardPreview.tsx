"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";
import { SlideItem, SubtitleConfig, TRANSITIONS } from "./types";

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
  /** When set, auto-plays a transition preview from this slide to the next */
  previewTransitionIdx: number | null;
  onPreviewTransitionDone: () => void;
}

interface SlideTimecode {
  slideIndex: number;
  startTime: number;
  endTime: number;
  transitionStart: number;
}

export default function StoryboardPreview({
  slides, activeSlide, aspectRatio, subtitleConfig, audio, onSlideChange,
  previewTransitionIdx, onPreviewTransitionDone,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveringTimeline, setHoveringTimeline] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);

  // Transition preview state
  const [previewingTransition, setPreviewingTransition] = useState(false);
  const [previewTransName, setPreviewTransName] = useState("");
  const previewRafRef = useRef<number | null>(null);
  const previewStartRef = useRef<number>(0);

  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);

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
    accTime += i < slides.length - 1 ? dur - transDur : dur;
  }
  const totalDuration = accTime || 1;

  // Find slide at time
  const getSlideAtTime = useCallback((t: number) => {
    for (let i = 0; i < timecodes.length; i++) {
      const tc = timecodes[i];
      if (t >= tc.startTime && t < tc.endTime) {
        if (t >= tc.transitionStart && i < timecodes.length - 1) {
          const transDur = slides[i].transitionDuration || 0.8;
          const progress = (t - tc.transitionStart) / transDur;
          return { primary: i, secondary: i + 1, progress: Math.min(1, progress) };
        }
        return { primary: i, secondary: -1, progress: 0 };
      }
    }
    return { primary: Math.max(0, slides.length - 1), secondary: -1, progress: 0 };
  }, [timecodes, slides]);

  // Animation loop
  const animate = useCallback(() => {
    const elapsed = (performance.now() - startTimeRef.current) / 1000;
    if (elapsed >= totalDuration) {
      setPlaying(false);
      setCurrentTime(totalDuration);
      setIsTransitioning(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    setCurrentTime(elapsed);
    const { primary, secondary, progress } = getSlideAtTime(elapsed);
    setCurrentSlideIdx(primary);
    setIsTransitioning(secondary >= 0);
    setTransitionProgress(progress);
    if (primary !== activeSlide) onSlideChange(primary);
    rafRef.current = requestAnimationFrame(animate);
  }, [totalDuration, getSlideAtTime, activeSlide, onSlideChange]);

  const togglePlay = () => {
    if (slides.length === 0) return;
    // Stop any transition preview
    if (previewingTransition) {
      stopTransitionPreview();
    }
    if (playing) {
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.pause();
    } else {
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

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);
  useEffect(() => {
    if (playing) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
  }, [animate, playing]);

  // ─── Transition Preview ───
  const stopTransitionPreview = useCallback(() => {
    if (previewRafRef.current) {
      cancelAnimationFrame(previewRafRef.current);
      previewRafRef.current = null;
    }
    setPreviewingTransition(false);
    setPreviewTransName("");
    setIsTransitioning(false);
    setTransitionProgress(0);
  }, []);

  useEffect(() => {
    if (previewTransitionIdx === null || previewTransitionIdx >= slides.length - 1) return;
    if (playing) {
      // Stop normal playback first
      setPlaying(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (audioRef.current) audioRef.current.pause();
    }

    const slide = slides[previewTransitionIdx];
    const nextSlide = slides[previewTransitionIdx + 1];
    if (!slide || !nextSlide) return;

    const transName = TRANSITIONS.find(t => t.id === slide.transition)?.name || slide.transition;
    setPreviewTransName(transName);
    setCurrentSlideIdx(previewTransitionIdx);
    setPreviewingTransition(true);

    // Phase 1: show current slide for 0.5s, then transition, then show next for 0.5s
    const holdBefore = 500; // ms
    const transDurMs = (slide.transitionDuration || 0.8) * 1000;
    const holdAfter = 500; // ms
    const totalMs = holdBefore + transDurMs + holdAfter;

    previewStartRef.current = performance.now();

    const animatePreview = () => {
      const elapsed = performance.now() - previewStartRef.current;

      if (elapsed >= totalMs) {
        // Done
        setIsTransitioning(false);
        setTransitionProgress(0);
        setCurrentSlideIdx(previewTransitionIdx + 1);
        stopTransitionPreview();
        onPreviewTransitionDone();
        return;
      }

      if (elapsed < holdBefore) {
        // Still holding on current slide
        setIsTransitioning(false);
        setTransitionProgress(0);
        setCurrentSlideIdx(previewTransitionIdx);
      } else if (elapsed < holdBefore + transDurMs) {
        // In transition
        const p = (elapsed - holdBefore) / transDurMs;
        setIsTransitioning(true);
        setTransitionProgress(Math.min(1, p));
        setCurrentSlideIdx(previewTransitionIdx);
      } else {
        // Hold on next slide
        setIsTransitioning(false);
        setTransitionProgress(0);
        setCurrentSlideIdx(previewTransitionIdx + 1);
      }

      previewRafRef.current = requestAnimationFrame(animatePreview);
    };

    previewRafRef.current = requestAnimationFrame(animatePreview);

    return () => {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewTransitionIdx]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewRafRef.current) cancelAnimationFrame(previewRafRef.current);
    };
  }, []);

  // Click on timeline to seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    if (previewingTransition) stopTransitionPreview();
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const t = x * totalDuration;
    seekTo(t);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(x * totalDuration);
  };

  const seekTo = (t: number) => {
    setCurrentTime(t);
    startTimeRef.current = performance.now() - t * 1000;
    const { primary } = getSlideAtTime(t);
    setCurrentSlideIdx(primary);
    onSlideChange(primary);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  const skipTo = (dir: -1 | 1) => {
    if (previewingTransition) stopTransitionPreview();
    const newIdx = Math.max(0, Math.min(slides.length - 1, currentSlideIdx + dir));
    const tc = timecodes[newIdx];
    if (tc) seekTo(tc.startTime);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  const getTransitionStyle = (transition: string, progress: number, isOutgoing: boolean) => {
    const opacity = isOutgoing ? 1 - progress : progress;
    if (transition === "fade" || transition === "dissolve") return { opacity };
    if (transition === "slideright") return { opacity: 1, transform: `translateX(${isOutgoing ? -progress * 100 : (1 - progress) * 100}%)` };
    if (transition === "slideleft") return { opacity: 1, transform: `translateX(${isOutgoing ? progress * 100 : -(1 - progress) * 100}%)` };
    if (transition === "slideup") return { opacity: 1, transform: `translateY(${isOutgoing ? progress * 100 : -(1 - progress) * 100}%)` };
    if (transition === "slidedown") return { opacity: 1, transform: `translateY(${isOutgoing ? -progress * 100 : (1 - progress) * 100}%)` };
    if (transition === "zoomin") return { opacity, transform: `scale(${isOutgoing ? 1 + progress * 0.3 : 0.7 + progress * 0.3})` };
    return { opacity };
  };

  const currentSlide = slides[currentSlideIdx];
  const nextSlide = isTransitioning && currentSlideIdx + 1 < slides.length ? slides[currentSlideIdx + 1] : null;
  const transition = currentSlide?.transition || "fade";

  /** Render slide media element (img or video) */
  const renderSlideMedia = (
    slide: SlideItem,
    alt: string,
    className: string,
    style: React.CSSProperties,
    key: string,
  ) => {
    if (slide.mediaType === 'video') {
      return (
        <video
          key={key}
          src={slide.objectUrl}
          poster={slide.videoThumbnailUrl || undefined}
          className={className}
          style={style}
          muted
          playsInline
          autoPlay={playing || previewingTransition}
          loop={false}
        />
      );
    }
    return (
      <img
        key={key}
        src={slide.objectUrl}
        alt={alt}
        className={className}
        style={style}
      />
    );
  };
  const progressPct = (currentTime / totalDuration) * 100;

  return (
    <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-700/50">
      {/* Video area */}
      <div
        className="relative bg-black flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: aspectRatio === "16:9" ? "16/9" : aspectRatio === "9:16" ? "9/16" : "1/1",
          maxHeight: "520px",
        }}
      >
        {slides.length > 0 && currentSlide ? (
          <>
            {/* Primary slide */}
            {renderSlideMedia(
              currentSlide,
              `Slide ${currentSlideIdx + 1}`,
              "absolute inset-0 w-full h-full object-cover",
              isTransitioning ? getTransitionStyle(transition, transitionProgress, true) : { opacity: 1 },
              `primary-${currentSlideIdx}`,
            )}
            {/* Secondary slide (transition) */}
            {isTransitioning && nextSlide && renderSlideMedia(
              nextSlide,
              `Slide ${currentSlideIdx + 2}`,
              "absolute inset-0 w-full h-full object-cover",
              getTransitionStyle(transition, transitionProgress, false),
              `secondary-${currentSlideIdx + 1}`,
            )}
            {/* Subtitle */}
            {subtitleConfig.enabled && currentSlide.subtitle && (
              <div className={`absolute left-0 right-0 text-center px-6 z-10 ${
                subtitleConfig.position === "top" ? "top-6" : subtitleConfig.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-8"
              }`}>
                <span className={`inline-block px-5 py-2.5 rounded-xl text-base font-bold leading-relaxed max-w-[85%] ${
                  subtitleConfig.bgStyle === "semi-transparent" ? "bg-black/60" : subtitleConfig.bgStyle === "blur" ? "bg-black/40 backdrop-blur-md" : ""
                } ${
                  subtitleConfig.color === "white" ? "text-white" : subtitleConfig.color === "yellow" ? "text-yellow-300" : "text-black"
                }`}>
                  {currentSlide.subtitle}
                </span>
              </div>
            )}
            {/* Slide indicator (top-right) */}
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-lg z-10">
              {currentSlideIdx + 1} / {slides.length}
            </div>
            {/* Transition name overlay (shown during transition preview and normal playback) */}
            {isTransitioning && (
              <div className="absolute top-3 left-3 bg-violet-600/80 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-lg z-10 flex items-center gap-1.5 animate-pulse">
                🎬 {previewingTransition ? previewTransName : (TRANSITIONS.find(t => t.id === transition)?.name || transition)}
              </div>
            )}
            {/* Click to play/pause overlay */}
            <button
              onClick={togglePlay}
              className="absolute inset-0 z-[5] cursor-pointer group"
            >
              {!playing && !previewingTransition && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play size={28} className="text-white ml-1" />
                  </div>
                </div>
              )}
            </button>
          </>
        ) : (
          <div className="text-center p-12">
            <div className="w-20 h-20 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <Play size={32} className="text-slate-600 ml-1" />
            </div>
            <p className="text-sm font-bold text-slate-400">Belum ada slide</p>
            <p className="text-xs text-slate-600 mt-1">Tambahkan gambar atau video di panel Timeline</p>
          </div>
        )}
      </div>

      {/* Controls bar */}
      {slides.length > 0 && (
        <div className="bg-gradient-to-t from-slate-900 to-slate-800 px-4 pt-3 pb-4">
          {/* Timeline */}
          <div
            ref={timelineRef}
            className="relative h-8 cursor-pointer group mb-1"
            onClick={handleTimelineClick}
            onMouseEnter={() => setHoveringTimeline(true)}
            onMouseLeave={() => setHoveringTimeline(false)}
            onMouseMove={handleTimelineHover}
          >
            {/* Background track */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-slate-700 rounded-full group-hover:h-2.5 transition-all" />

            {/* Slide segments */}
            {timecodes.map((tc, i) => {
              const left = (tc.startTime / totalDuration) * 100;
              const width = ((tc.endTime - tc.startTime) / totalDuration) * 100;
              const colors = [
                "bg-violet-500/30", "bg-purple-500/30", "bg-indigo-500/30",
                "bg-blue-500/30", "bg-cyan-500/30", "bg-emerald-500/30",
                "bg-amber-500/30", "bg-rose-500/30",
              ];
              return (
                <div
                  key={i}
                  className={`absolute top-1/2 -translate-y-1/2 h-1.5 group-hover:h-2.5 transition-all rounded-sm ${colors[i % colors.length]}`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                />
              );
            })}

            {/* Progress fill */}
            {!previewingTransition && (
              <div
                className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 bg-gradient-to-r from-violet-500 to-purple-400 rounded-full group-hover:h-2.5 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            )}

            {/* Playhead */}
            {!previewingTransition && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-black/30 border-2 border-violet-400 -ml-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style={{ left: `${progressPct}%` }}
              />
            )}

            {/* Hover tooltip */}
            {hoveringTimeline && (
              <div
                className="absolute -top-7 bg-slate-700 text-white text-[10px] font-bold px-2 py-0.5 rounded -ml-4 pointer-events-none"
                style={{ left: `${(hoverTime / totalDuration) * 100}%` }}
              >
                {fmt(hoverTime)}
              </div>
            )}
          </div>

          {/* Time + Controls */}
          <div className="flex items-center justify-between">
            {/* Time display */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white">{fmt(currentTime)}</span>
              <span className="text-xs text-slate-500">/</span>
              <span className="text-xs font-mono text-slate-400">{fmt(totalDuration)}</span>
            </div>

            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => skipTo(-1)}
                disabled={currentSlideIdx === 0}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:text-slate-600 transition-all"
                title="Slide sebelumnya"
              >
                <SkipBack size={18} />
              </button>
              <button
                onClick={togglePlay}
                className="p-3 rounded-full bg-white hover:bg-slate-100 text-slate-900 shadow-lg transition-all mx-1"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              <button
                onClick={() => skipTo(1)}
                disabled={currentSlideIdx >= slides.length - 1}
                className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white disabled:text-slate-600 transition-all"
                title="Slide berikutnya"
              >
                <SkipForward size={18} />
              </button>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {audio && (
                <button
                  onClick={() => {
                    setMuted(!muted);
                    if (audioRef.current) audioRef.current.muted = !muted;
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all"
                  title={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
              <span className="text-[10px] text-slate-500 font-bold ml-1">
                Slide {currentSlideIdx + 1}/{slides.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio */}
      {audio && <audio ref={audioRef} src={audio.objectUrl} preload="auto" muted={muted} />}
    </div>
  );
}
