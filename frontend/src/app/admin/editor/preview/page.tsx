"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, Send } from "lucide-react";
import ContentRenderer from "@/components/ContentRenderer";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

const PREVIEW_KEY = "adably_preview_data";

export default function PreviewPage() {
  const router = useRouter();
  const [content, setContent] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(PREVIEW_KEY);
    if (!raw) {
      toast.error("Tidak ada data preview");
      router.push("/admin/editor");
      return;
    }
    try {
      const data = JSON.parse(raw);
      setContent(data);
    } catch {
      toast.error("Data preview tidak valid");
      router.push("/admin/editor");
    }
  }, []);

  const handleSubmitReview = async () => {
    if (!content?.editId) {
      toast.error("Simpan konten terlebih dahulu sebelum mengajukan review");
      return;
    }
    setIsSubmitting(true);
    const token = Cookies.get("access_token");
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    try {
      const r = await fetch(`${API}/editor/content/${content.editId}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error();
      toast.success("Konten berhasil diajukan untuk review!");
      localStorage.removeItem(PREVIEW_KEY);
      router.push("/admin/my-contents");
    } catch {
      toast.error("Gagal mengajukan review");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Build preview content object matching the shape ContentRenderer expects
  const previewContent = {
    title: content.title,
    description: content.description,
    type: content.contentType === "PEMBELAJARAN" ? "ARTICLE" : content.contentType,
    ageGroups: content.ageGroups,
    authorName: content.displayAuthorName || "Anda",
    tags: content.tags,
    enableAudio: content.enableAudio,
    qnaDetail: content.contentType === "QNA" ? {
      question: content.title,
      answerQuick: content.blocks?.find((b: any) => b.type === "quick_answer")?.data?.text || "",
      dialogBlocks: content.blocks?.filter((b: any) => b.type === "dialog").map((b: any) => b.data) || [],
      dalilBlocks: content.blocks?.filter((b: any) => b.type === "dalil").map((b: any) => b.data) || [],
      analogyBlocks: content.blocks?.filter((b: any) => b.type === "analogy").map((b: any) => b.data) || [],
      tipsBlocks: content.blocks?.filter((b: any) => b.type === "tip").map((b: any) => b.data) || [],
    } : undefined,
    articleDetail: content.contentType !== "QNA" ? {
      blocks: content.blocks?.map((b: any) => ({ type: b.type, ...b.data })) || [],
    } : undefined,
  };

  return (
    <div className="space-y-6">
      {/* Sticky Top Bar */}
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-200 rounded-full flex items-center justify-center">
            <Eye className="text-amber-700" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-amber-800 text-sm">Mode Preview</h2>
            <p className="text-xs text-amber-600">Tampilan konten di mata pengunjung website</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/admin/editor")} className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50">
            <ChevronLeft size={14} /> Kembali ke Editor
          </button>
          {content.editId && (
            <button onClick={handleSubmitReview} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-50">
              <Send size={14} /> {isSubmitting ? "Mengajukan..." : "Ajukan Review"}
            </button>
          )}
        </div>
      </div>

      {/* Preview Content — Mimicking the public page appearance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <ContentRenderer content={previewContent} isPreview={true} />
      </div>
    </div>
  );
}
