"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Square, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  blocks: any[];
  contentType?: string;
}

function extractReadableText(blocks: any[], contentType?: string): string[] {
  const segments: string[] = [];

  for (const block of blocks) {
    const type = block.type;

    if (type === "quick_answer" && block.text) {
      segments.push(block.text);
    }

    if (type === "paragraph" && block.text) {
      segments.push(block.text);
    }

    if (type === "heading" && block.text) {
      segments.push(block.text);
    }

    if (type === "dialog") {
      const lines = block.lines || [{ role: block.role, text: block.text }];
      for (const line of lines) {
        if (line.text) {
          const speaker = line.role === "anak" ? "Anak" : line.role === "ibu" ? "Ibu" : "Ayah";
          segments.push(`${speaker} berkata: ${line.text}`);
        }
      }
    }

    if (type === "dalil") {
      const entries = block.entries || [block];
      for (const entry of entries) {
        // Only read translation, NOT arabic text or source
        if (entry.translation) {
          segments.push(entry.translation);
        }
      }
    }

    if (type === "analogy") {
      if (block.text) segments.push(block.text);
    }

    if (type === "tip") {
      if (block.text) segments.push(block.text);
    }

    if (type === "hikmah") {
      if (block.text) segments.push(block.text);
    }

    if (type === "doa") {
      // Baca terjemahan saja (teks arab di-skip untuk TTS)
      if (block.translation) segments.push(block.translation);
    }
    // Skip: image, video, headings, titles, sources, arabic text
  }

  return segments;
}

export default function AudioPlayer({ blocks, contentType }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentSegment, setCurrentSegment] = useState(0);
  const [totalSegments, setTotalSegments] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const segmentsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices();
      // Prefer Indonesian voices, fallback to any
      const idVoices = allVoices.filter(v => v.lang.startsWith("id"));
      const fallback = allVoices.filter(v => v.lang.startsWith("en") || v.lang.startsWith("ms"));
      const available = idVoices.length > 0 ? idVoices : fallback.length > 0 ? fallback : allVoices.slice(0, 5);
      setVoices(available);
      if (available.length > 0 && !selectedVoice) {
        setSelectedVoice(available[0].name);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.cancel();
    };
  }, []);

  const speakSegment = useCallback((index: number) => {
    if (index >= segmentsRef.current.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setProgress(100);
      isPlayingRef.current = false;
      return;
    }

    if (!isPlayingRef.current) return;

    currentIndexRef.current = index;
    setCurrentSegment(index + 1);
    setProgress(Math.round((index / segmentsRef.current.length) * 100));

    const utterance = new SpeechSynthesisUtterance(segmentsRef.current[index]);
    utterance.rate = speed;
    utterance.pitch = 1;

    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (isPlayingRef.current) {
        // Small pause between segments
        setTimeout(() => speakSegment(index + 1), 300);
      }
    };

    utterance.onerror = () => {
      if (isPlayingRef.current) {
        speakSegment(index + 1);
      }
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [speed, selectedVoice, voices]);

  const handlePlay = () => {
    if (isPaused) {
      speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    speechSynthesis.cancel();
    const segments = extractReadableText(blocks, contentType);
    if (segments.length === 0) return;

    segmentsRef.current = segments;
    setTotalSegments(segments.length);
    setProgress(0);
    setIsPlaying(true);
    setIsPaused(false);
    isPlayingRef.current = true;
    speakSegment(0);
  };

  const handlePause = () => {
    speechSynthesis.pause();
    setIsPaused(true);
    setIsPlaying(false);
  };

  const handleStop = () => {
    speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setProgress(0);
    setCurrentSegment(0);
    isPlayingRef.current = false;
  };

  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 my-6 shadow-lg">
      <div className="flex items-center gap-3">
        <Volume2 size={18} className="text-emerald-400 shrink-0" />
        <span className="text-white font-bold text-sm shrink-0">Dengarkan</span>

        {/* Controls */}
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <button onClick={handlePause} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
              <Pause size={16} />
            </button>
          ) : (
            <button onClick={handlePlay} className="w-9 h-9 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 rounded-full text-white transition-all shadow-md">
              <Play size={16} className="ml-0.5" />
            </button>
          )}
          <button onClick={handleStop} disabled={!isPlaying && !isPaused} className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-all disabled:opacity-30">
            <Square size={14} />
          </button>
        </div>

        {/* Progress */}
        <div className="flex-1 mx-2">
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div className="bg-emerald-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          {totalSegments > 0 && (
            <p className="text-[10px] text-white/40 mt-1">{currentSegment}/{totalSegments} bagian</p>
          )}
        </div>

        {/* Voice */}
        {voices.length > 0 && (
          <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border-0 max-w-[120px]">
            {voices.map(v => (
              <option key={v.name} value={v.name} className="text-black">{v.name.split(" ").slice(0, 2).join(" ")}</option>
            ))}
          </select>
        )}

        {/* Speed */}
        <select value={speed} onChange={e => setSpeed(parseFloat(e.target.value))} className="bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border-0">
          <option value="0.8" className="text-black">0.8x</option>
          <option value="1" className="text-black">1x</option>
          <option value="1.2" className="text-black">1.2x</option>
          <option value="1.5" className="text-black">1.5x</option>
        </select>
      </div>
    </div>
  );
}
