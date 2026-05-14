"use client";
import { useState, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  Film, Upload, Image, Music, Play, Download, Loader2, RefreshCw,
  CheckCircle, AlertCircle, UploadCloud,
} from "lucide-react";
import { SlideItem, AudioItem, SubtitleConfig } from "./types";

interface SlideWithFile extends SlideItem {
  file: File;
}
interface AudioWithFile extends AudioItem {
  file: File;
}
import SlideTimeline from "./SlideTimeline";
import RenderSettings from "./RenderSettings";
import ContentLinker from "./ContentLinker";
import {
  uploadStoryboardAssets, renderStoryboard, getStoryboardStatus,
  downloadStoryboardVideo, uploadStoryboardToStorage,
} from "@/lib/api";

type RenderState = "idle" | "uploading" | "rendering" | "done" | "error";

export default function StoryboardToolsPage() {
  // ─── State ───
  const [slides, setSlides] = useState<SlideWithFile[]>([]);
  const [audio, setAudio] = useState<AudioWithFile | null>(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Render config
  const [fps, setFps] = useState(30);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleConfig>({
    enabled: false, font: "montserrat", fontSize: "medium",
    color: "white", position: "bottom", bgStyle: "semi-transparent",
  });

  // Render progress
  const [renderState, setRenderState] = useState<RenderState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  // Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Image Upload ───
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newSlides: SlideWithFile[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type.startsWith("image/")) continue;
      newSlides.push({
        id: `img-${Date.now()}-${i}`,
        imageId: "",
        filename: f.name,
        objectUrl: URL.createObjectURL(f),
        file: f, // preserve original File for upload
        duration: 5,
        transition: "fade",
        transitionDuration: 0.8,
        subtitle: "",
      });
    }
    setSlides(prev => [...prev, ...newSlides]);
    toast.success(`${newSlides.length} gambar ditambahkan`);
    e.target.value = "";
  };

  // ─── Audio Upload ───
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !f.type.startsWith("audio/")) return;
    if (audio?.objectUrl) URL.revokeObjectURL(audio.objectUrl);
    setAudio({
      id: `aud-${Date.now()}`,
      filename: f.name,
      objectUrl: URL.createObjectURL(f),
      file: f, // preserve original File for upload
    });
    toast.success("Audio ditambahkan");
    e.target.value = "";
  };

  // ─── Slide Operations ───
  const handleReorder = (from: number, to: number) => {
    setSlides(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  const handleRemoveSlide = (i: number) => {
    URL.revokeObjectURL(slides[i].objectUrl);
    setSlides(prev => prev.filter((_, idx) => idx !== i));
    if (activeSlide >= slides.length - 1) setActiveSlide(Math.max(0, slides.length - 2));
  };

  const handleUpdateSlide = (i: number, patch: Partial<SlideItem>) => {
    setSlides(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  // ─── Render Pipeline ───
  const handleRender = async () => {
    if (slides.length === 0) { toast.error("Tambahkan minimal 1 gambar"); return; }
    const token = Cookies.get("_at") || "";

    try {
      // Phase 1: Upload
      setRenderState("uploading");
      setProgress(0);
      setErrorMsg("");

      // Use preserved original File objects (avoids lossy blob reconversion)
      const allFiles: File[] = slides.map(s => s.file);
      if (audio) {
        allFiles.push(audio.file);
      }

      const uploadResult = await uploadStoryboardAssets(token, allFiles, sessionId || undefined);
      const sid = uploadResult.sessionId;
      setSessionId(sid);

      // Map uploaded image IDs back to slides
      const uploadedSlides = slides.map((s, i) => ({
        imageId: uploadResult.images[i]?.id || s.imageId,
        duration: s.duration,
        transition: s.transition,
        transitionDuration: s.transitionDuration,
        subtitle: s.subtitle || undefined,
      }));

      // Phase 2: Render
      setRenderState("rendering");
      setProgress(10);

      await renderStoryboard(token, {
        sessionId: sid,
        slides: uploadedSlides,
        audioId: uploadResult.audio?.id,
        aspectRatio: aspectRatio as any,
        fps,
        subtitleConfig: subtitleConfig.enabled ? subtitleConfig : undefined,
      });

      // Phase 3: Poll status
      pollRef.current = setInterval(async () => {
        try {
          const status = await getStoryboardStatus(token, sid);
          setProgress(status.progress || 0);
          if (status.status === "done") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRenderState("done");
            setProgress(100);
            toast.success("🎬 Video selesai di-render!");
          } else if (status.status === "error") {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRenderState("error");
            setErrorMsg(status.error || "Render gagal");
            toast.error("Render gagal: " + (status.error || "Unknown error"));
          }
        } catch {
          // Polling error — ignore, retry next tick
        }
      }, 2000);
    } catch (err: any) {
      setRenderState("error");
      setErrorMsg(err.message || "Upload/render gagal");
      toast.error(err.message || "Gagal");
    }
  };

  // ─── Download ───
  const handleDownload = async () => {
    if (!sessionId) return;
    const token = Cookies.get("_at") || "";
    try {
      toast.loading("Downloading...", { id: "dl" });
      const blob = await downloadStoryboardVideo(token, sessionId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `storyboard-${sessionId.slice(0, 8)}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download dimulai!", { id: "dl" });
    } catch (err: any) {
      toast.error(err.message || "Download gagal", { id: "dl" });
    }
  };

  // ─── Upload to Storage ───
  const handleUploadToStorage = async () => {
    if (!sessionId) return;
    const token = Cookies.get("_at") || "";
    try {
      toast.loading("Uploading to storage...", { id: "upload-st" });
      const result = await uploadStoryboardToStorage(token, sessionId);
      toast.success("Video di-upload ke storage!", { id: "upload-st" });
    } catch (err: any) {
      toast.error(err.message || "Upload gagal", { id: "upload-st" });
    }
  };

  const totalDuration = slides.reduce((sum, s) => sum + s.duration, 0);
  const isProcessing = renderState === "uploading" || renderState === "rendering";

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Film className="h-6 w-6 text-violet-600" /> Storyboard Tools
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Buat video slideshow dari gambar + audio dengan transisi premium</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-all disabled:opacity-50"
          >
            <Image size={16} /> Gambar
          </button>
          <button
            onClick={() => audioInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:border-violet-300 hover:bg-violet-50 transition-all disabled:opacity-50"
          >
            <Music size={16} /> Audio
          </button>
          <button
            onClick={handleRender}
            disabled={isProcessing || slides.length === 0}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-200 transition-all disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {renderState === "uploading" ? "Uploading..." : renderState === "rendering" ? "Rendering..." : "Render Video"}
          </button>
        </div>
      </div>

      {/* Hidden inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />

      {/* Progress bar */}
      {isProcessing && (
        <div className="mb-6 bg-violet-50 border border-violet-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-violet-700">
              {renderState === "uploading" ? "📤 Uploading file..." : "🎬 Rendering video..."}
            </span>
            <span className="text-xs font-bold text-violet-600">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-violet-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Done / Error banner */}
      {renderState === "done" && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle size={16} /> Video selesai! 🎉
          </span>
          <div className="flex gap-2">
            <button onClick={handleDownload} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all">
              <Download size={14} /> Download MP4
            </button>
            <button onClick={handleUploadToStorage} className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-all">
              <UploadCloud size={14} /> Upload Storage
            </button>
          </div>
        </div>
      )}
      {renderState === "error" && (
        <div className="mb-6 bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-500" />
          <span className="text-sm font-bold text-rose-700">{errorMsg}</span>
          <button onClick={() => setRenderState("idle")} className="ml-auto text-xs text-rose-600 hover:underline">Tutup</button>
        </div>
      )}

      {/* Main layout: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Timeline */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm max-h-[calc(100vh-280px)] overflow-y-auto">
          <SlideTimeline
            slides={slides}
            activeSlide={activeSlide}
            onSelect={setActiveSlide}
            onReorder={handleReorder}
            onRemove={handleRemoveSlide}
            onUpdate={handleUpdateSlide}
          />
          {/* Audio info */}
          {audio && (
            <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-xl">
              <p className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">🎵 Audio</p>
              <p className="text-xs text-slate-700 truncate">{audio.filename}</p>
              <audio controls className="w-full mt-2 h-8" preload="metadata">
                <source src={audio.objectUrl} />
              </audio>
              <button
                onClick={() => { URL.revokeObjectURL(audio.objectUrl); setAudio(null); }}
                className="text-[10px] text-rose-500 hover:underline mt-1"
              >
                Hapus audio
              </button>
            </div>
          )}
          {/* Duration summary */}
          {slides.length > 0 && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Durasi</p>
              <p className="text-lg font-bold text-slate-800">{totalDuration.toFixed(1)}s</p>
            </div>
          )}
        </div>

        {/* Center: Preview */}
        <div className="lg:col-span-5 xl:col-span-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-1">
              <p className="text-[10px] text-slate-400 text-center font-medium">Preview</p>
            </div>
            <div className="bg-black flex items-center justify-center" style={{
              aspectRatio: aspectRatio === "16:9" ? "16/9" : aspectRatio === "9:16" ? "9/16" : "1/1",
              maxHeight: "500px",
            }}>
              {slides.length > 0 && slides[activeSlide] ? (
                <div className="relative w-full h-full">
                  <img
                    src={slides[activeSlide].objectUrl}
                    alt={`Slide ${activeSlide + 1}`}
                    className="w-full h-full object-contain"
                  />
                  {subtitleConfig.enabled && slides[activeSlide].subtitle && (
                    <div className={`absolute left-0 right-0 text-center px-4 py-2 ${
                      subtitleConfig.position === "top" ? "top-4" : subtitleConfig.position === "center" ? "top-1/2 -translate-y-1/2" : "bottom-4"
                    }`}>
                      <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                        subtitleConfig.bgStyle === "semi-transparent" ? "bg-black/50" : subtitleConfig.bgStyle === "blur" ? "bg-black/30 backdrop-blur-sm" : ""
                      } ${
                        subtitleConfig.color === "white" ? "text-white" : subtitleConfig.color === "yellow" ? "text-yellow-400" : "text-black"
                      }`}>
                        {slides[activeSlide].subtitle}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-center p-8">
                  <Film size={48} className="mx-auto mb-3 text-slate-600" />
                  <p className="text-sm font-bold">Belum ada slide</p>
                  <p className="text-xs text-slate-600 mt-1">Klik tombol &quot;Gambar&quot; untuk upload</p>
                </div>
              )}
            </div>
            {/* Slide navigation */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-1 p-3 bg-slate-50">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === activeSlide ? "bg-violet-500 w-6" : "bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Settings + Content Link */}
        <div className="lg:col-span-3 space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <RenderSettings
              fps={fps}
              aspectRatio={aspectRatio}
              subtitleConfig={subtitleConfig}
              onFpsChange={setFps}
              onAspectChange={setAspectRatio}
              onSubtitleChange={setSubtitleConfig}
            />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <ContentLinker sessionId={sessionId} />
          </div>
        </div>
      </div>
    </div>
  );
}
