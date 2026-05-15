"use client";
import { useState, useRef, useEffect } from "react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import {
  Film, Upload, Image, Music, Play, Download, Loader2, RefreshCw,
  CheckCircle, AlertCircle, UploadCloud, Plus,
} from "lucide-react";
import { SlideItem, AudioItem, SubtitleConfig, MediaType } from "./types";

interface SlideWithFile extends SlideItem {
  file: File;
}
interface AudioWithFile extends AudioItem {
  file: File;
}
import SlideTimeline from "./SlideTimeline";
import RenderSettings from "./RenderSettings";
import ContentLinker from "./ContentLinker";
import ImageCropModal from "./ImageCropModal";
import StoryboardPreview from "./StoryboardPreview";
import {
  uploadStoryboardAssets, renderStoryboard, getStoryboardStatus,
  downloadStoryboardVideo, uploadStoryboardToStorage, deleteStoryboardAsset,
} from "@/lib/api";

type RenderState = "idle" | "uploading" | "rendering" | "done" | "error";

/** Extract video duration and thumbnail from a video file */
function extractVideoMeta(file: File): Promise<{ duration: number; thumbnailUrl: string }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = () => {
      const duration = video.duration || 5;
      // Seek to 0.5s (or 0 if very short) for thumbnail
      video.currentTime = Math.min(0.5, duration / 2);
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve({ duration: video.duration || 5, thumbnailUrl });
        } else {
          resolve({ duration: video.duration || 5, thumbnailUrl: "" });
        }
      } catch {
        resolve({ duration: video.duration || 5, thumbnailUrl: "" });
      }
      URL.revokeObjectURL(objectUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ duration: 5, thumbnailUrl: "" });
    };
  });
}

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
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Crop state
  const [cropSlideIdx, setCropSlideIdx] = useState<number | null>(null);

  // Transition preview state
  const [previewTransitionIdx, setPreviewTransitionIdx] = useState<number | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── Media Upload (images + videos) ───
  const handleMediaUpload = async (files: FileList) => {
    const newSlides: SlideWithFile[] = [];
    const videoPromises: Promise<void>[] = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const isVideo = f.type.startsWith("video/");
      const isImage = f.type.startsWith("image/");

      if (!isVideo && !isImage) continue;

      if (isVideo) {
        // Process video asynchronously (extract duration + thumbnail)
        const idx = newSlides.length;
        const objectUrl = URL.createObjectURL(f);
        newSlides.push({
          id: `vid-${Date.now()}-${i}`,
          imageId: "",
          filename: f.name,
          objectUrl,
          file: f,
          duration: 5, // Placeholder — will be updated after probe
          transition: "fade",
          transitionDuration: 0.8,
          subtitle: "",
          mediaType: "video",
          videoDuration: undefined,
          videoThumbnailUrl: undefined,
        });

        videoPromises.push(
          extractVideoMeta(f).then(meta => {
            newSlides[idx].duration = Math.round(meta.duration * 10) / 10;
            newSlides[idx].videoDuration = meta.duration;
            newSlides[idx].videoThumbnailUrl = meta.thumbnailUrl || undefined;
          }),
        );
      } else {
        // Image: immediate
        newSlides.push({
          id: `img-${Date.now()}-${i}`,
          imageId: "",
          filename: f.name,
          objectUrl: URL.createObjectURL(f),
          file: f,
          duration: 5,
          transition: "fade",
          transitionDuration: 0.8,
          subtitle: "",
          mediaType: "image",
        });
      }
    }

    // Wait for all video probes to complete
    if (videoPromises.length > 0) {
      await Promise.all(videoPromises);
    }

    const imgCount = newSlides.filter(s => s.mediaType === "image").length;
    const vidCount = newSlides.filter(s => s.mediaType === "video").length;
    const parts: string[] = [];
    if (imgCount > 0) parts.push(`${imgCount} gambar`);
    if (vidCount > 0) parts.push(`${vidCount} video`);

    setSlides(prev => [...prev, ...newSlides]);
    toast.success(`${parts.join(" + ")} ditambahkan`);
  };

  // ─── Audio Upload ───
  const handleAudioUpload = (f: File) => {
    if (audio?.objectUrl) URL.revokeObjectURL(audio.objectUrl);
    setAudio({
      id: `aud-${Date.now()}`,
      filename: f.name,
      objectUrl: URL.createObjectURL(f),
      file: f,
    });
    toast.success("Audio ditambahkan");
  };

  const handleRemoveAudio = () => {
    if (audio) {
      URL.revokeObjectURL(audio.objectUrl);
      setAudio(null);
      toast.success("Audio dihapus");
    }
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

  const handleRemoveSlide = async (i: number) => {
    const slide = slides[i];
    URL.revokeObjectURL(slide.objectUrl);
    if (slide.videoThumbnailUrl) {
      // videoThumbnailUrl is a data URL, no need to revoke
    }

    // If session exists and slide has a server-side imageId, delete from server
    if (sessionId && slide.imageId) {
      const token = Cookies.get("_at") || "";
      try {
        await deleteStoryboardAsset(token, sessionId, slide.imageId);
      } catch {
        // Continue even if server delete fails — local state is primary
      }
    }

    setSlides(prev => prev.filter((_, idx) => idx !== i));
    if (activeSlide >= slides.length - 1) setActiveSlide(Math.max(0, slides.length - 2));
    toast.success("Slide dihapus");
  };

  const handleUpdateSlide = (i: number, patch: Partial<SlideItem>) => {
    setSlides(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };

  // ─── Crop (image only) ───
  const handleCropSlide = (i: number) => {
    // Prevent cropping video slides
    if (slides[i]?.mediaType === "video") {
      toast.error("Crop tidak tersedia untuk video");
      return;
    }
    setCropSlideIdx(i);
  };

  const handleCropApply = (croppedFile: File, croppedUrl: string) => {
    if (cropSlideIdx === null) return;
    const oldUrl = slides[cropSlideIdx].objectUrl;
    URL.revokeObjectURL(oldUrl);
    setSlides(prev => prev.map((s, idx) =>
      idx === cropSlideIdx
        ? { ...s, file: croppedFile, objectUrl: croppedUrl, filename: croppedFile.name, imageId: "" }
        : s
    ));
    setCropSlideIdx(null);
    toast.success("Crop diterapkan! Re-upload saat render.");
  };

  // ─── Transition Preview ───
  const handlePreviewTransition = (slideIdx: number) => {
    // Trigger a new preview (use a unique key to force re-trigger even for same index)
    setPreviewTransitionIdx(null);
    requestAnimationFrame(() => setPreviewTransitionIdx(slideIdx));
  };

  const handlePreviewTransitionDone = () => {
    setPreviewTransitionIdx(null);
  };

  // ─── Render Pipeline ───
  const handleRender = async () => {
    if (slides.length === 0) { toast.error("Tambahkan minimal 1 gambar/video"); return; }
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

      // Map uploaded file IDs back to slides
      // Server returns separate images[] and videos[] arrays — we need to match by order
      let imgIdx = 0;
      let vidIdx = 0;
      const uploadedSlides = slides.map((s) => {
        let fileId: string;
        if (s.mediaType === "video") {
          fileId = uploadResult.videos?.[vidIdx]?.id || s.imageId;
          vidIdx++;
        } else {
          fileId = uploadResult.images?.[imgIdx]?.id || s.imageId;
          imgIdx++;
        }
        return {
          imageId: fileId,
          duration: s.duration,
          transition: s.transition,
          transitionDuration: s.transitionDuration,
          subtitle: s.subtitle || undefined,
          mediaType: s.mediaType || "image" as MediaType,
        };
      });

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
      await uploadStoryboardToStorage(token, sessionId);
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
          <p className="text-slate-500 mt-1 text-sm">Buat video dari gambar + video klip + audio dengan transisi premium</p>
        </div>
        <div className="flex items-center gap-2">
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
            isProcessing={isProcessing}
            audio={audio}
            onSelect={setActiveSlide}
            onReorder={handleReorder}
            onRemove={handleRemoveSlide}
            onUpdate={handleUpdateSlide}
            onCrop={handleCropSlide}
            onAddMedia={handleMediaUpload}
            onAddAudio={handleAudioUpload}
            onRemoveAudio={handleRemoveAudio}
            onPreviewTransition={handlePreviewTransition}
            totalDuration={totalDuration}
          />
        </div>

        {/* Center: Preview */}
        <div className="lg:col-span-5 xl:col-span-6">
          <StoryboardPreview
            slides={slides}
            activeSlide={activeSlide}
            aspectRatio={aspectRatio}
            subtitleConfig={subtitleConfig}
            audio={audio}
            onSlideChange={setActiveSlide}
            previewTransitionIdx={previewTransitionIdx}
            onPreviewTransitionDone={handlePreviewTransitionDone}
          />
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

      {/* Crop Modal — only for image slides */}
      {cropSlideIdx !== null && slides[cropSlideIdx] && slides[cropSlideIdx].mediaType !== "video" && (
        <ImageCropModal
          imageUrl={slides[cropSlideIdx].objectUrl}
          aspectRatio={aspectRatio}
          originalMimeType={slides[cropSlideIdx].file.type}
          onCrop={handleCropApply}
          onClose={() => setCropSlideIdx(null)}
        />
      )}
    </div>
  );
}
