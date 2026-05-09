"use client";

import { useState, useEffect } from "react";
import { fetchReviewQueue, processReview, fetchContentForEdit, updateContent, API_BASE_URL } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { ClipboardCheck, Check, X, Edit2, AlertCircle, Eye, ChevronDown, ChevronUp, Image, Crop, ExternalLink } from "lucide-react";
import ImageCropperModal from "@/components/ImageCropperModal";

export default function ReviewPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, any>>({});
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);
  const [pointAdjustment, setPointAdjustment] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  // ── Thumbnail crop state ──
  const [cropTarget, setCropTarget] = useState<{ contentId: string; type: 'web' | 'social' } | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState<string | null>(null);

  const handleThumbnailCropStart = (contentId: string, type: 'web' | 'social') => {
    // Open file picker, then show cropper
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { toast.error('Ukuran maksimal 15MB'); return; }
      setCropTarget({ contentId, type });
      setCropSrc(URL.createObjectURL(file));
    };
    input.click();
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!cropTarget) return;
    const { contentId, type } = cropTarget;
    // Revoke object URL to prevent memory leak
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    setCropTarget(null);
    setThumbnailUploading(contentId);
    try {
      const token = Cookies.get('_at');
      if (!token) return;
      // Step 1: Upload cropped image
      const formData = new FormData();
      formData.append('file', blob, `thumb-${type}-${Date.now()}.jpg`);
      const uploadRes = await fetch(`${API_BASE_URL}/editor/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Upload gagal');
      const { url } = await uploadRes.json();
      // Step 2: Update content with new thumbnail URL
      const updatePayload: any = type === 'web'
        ? { thumbnailUrl: url }
        : { socialThumbnailUrl: url };
      await updateContent(contentId, updatePayload, token);
      // Step 3: Refresh preview data
      const res = await fetchContentForEdit(token, contentId);
      setPreviewData(prev => ({ ...prev, [contentId]: res.data }));
      toast.success(`Thumbnail ${type === 'web' ? 'web' : 'sosmed'} berhasil diperbarui!`);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengupload thumbnail');
    } finally {
      setThumbnailUploading(null);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const token = Cookies.get("_at");
      if (!token) return;
      const response = await fetchReviewQueue(token);
      setQueue(response.data || []);
    } catch (error) {
      toast.error("Gagal memuat antrean review");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePreview = async (id: string) => {
    if (expandedPreview === id) {
      setExpandedPreview(null);
      return;
    }
    setExpandedPreview(id);
    if (previewData[id]) return; // Already loaded
    setLoadingPreview(id);
    try {
      const token = Cookies.get("_at");
      if (!token) return;
      const res = await fetchContentForEdit(token, id);
      setPreviewData(prev => ({ ...prev, [id]: res.data }));
    } catch {
      toast.error("Gagal memuat detail konten");
    } finally {
      setLoadingPreview(null);
    }
  };

  const handleActionClick = (id: string, action: 'approve' | 'reject' | 'revision') => {
    setShowNotesFor(id);
    setActionType(action);
    setActiveNotes("");
    setPointAdjustment(0);
    setAdjustmentReason("");
  };

  const submitAction = async (id: string) => {
    if (!actionType) return;
    if (pointAdjustment !== 0 && adjustmentReason.trim().length < 3) {
      toast.error("Alasan penyesuaian poin wajib diisi (min. 3 karakter)");
      return;
    }
    setProcessingId(id);
    try {
      const token = Cookies.get("_at");
      if (!token) return;
      await processReview(
        id, actionType, activeNotes, token,
        pointAdjustment !== 0 ? pointAdjustment : undefined,
        pointAdjustment !== 0 ? adjustmentReason : undefined,
      );
      toast.success(`Konten berhasil di-${actionType}`);
      setShowNotesFor(null);
      loadQueue();
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses review");
    } finally {
      setProcessingId(null);
    }
  };

  const renderPreview = (data: any) => {
    if (!data) return null;
    const isUploading = thumbnailUploading === data.id;
    return (
      <div className="border-t border-slate-200 bg-slate-50/70 p-5 space-y-4">
        {/* Thumbnail Preview + Crop */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">🖼️ Thumbnail</h4>
          <div className="flex flex-wrap gap-4">
            {/* Web Thumbnail (16:9) */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Web (16:9)</p>
              {data.thumbnailUrl ? (
                <div className="relative w-40 h-[90px] rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                  <img src={data.thumbnailUrl} alt="Web thumbnail" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-40 h-[90px] rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                  <Image size={20} />
                </div>
              )}
              <button
                onClick={() => handleThumbnailCropStart(data.id, 'web')}
                disabled={isUploading}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
              >
                <Crop size={12} /> {data.thumbnailUrl ? 'Ganti & Crop' : 'Upload & Crop'}
              </button>
            </div>
            {/* Social Thumbnail (1:1) */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Sosmed (1:1)</p>
              {data.socialThumbnailUrl ? (
                <div className="relative w-[90px] h-[90px] rounded-lg overflow-hidden border border-pink-200 shadow-sm">
                  <img src={data.socialThumbnailUrl} alt="Social thumbnail" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-[90px] h-[90px] rounded-lg border-2 border-dashed border-pink-200 flex items-center justify-center text-pink-300">
                  <Image size={20} />
                </div>
              )}
              <button
                onClick={() => handleThumbnailCropStart(data.id, 'social')}
                disabled={isUploading}
                className="flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 disabled:opacity-50"
              >
                <Crop size={12} /> {data.socialThumbnailUrl ? 'Ganti & Crop' : 'Upload & Crop'}
              </button>
            </div>
            {isUploading && <p className="text-xs text-slate-400 animate-pulse self-center">Mengupload...</p>}
          </div>
        </div>

        {/* Description */}
        {data.description && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Deskripsi</h4>
            <p className="text-sm text-slate-700">{data.description}</p>
          </div>
        )}

        {/* Tags */}
        {data.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.tags.map((t: any, i: number) => (
              <span key={i} className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-bold rounded">{t.tag?.name || t.name}</span>
            ))}
          </div>
        )}

        {/* Opening / Mukadimah */}
        {data.openingText && (
          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3">
            <h4 className="text-xs font-bold text-emerald-700 mb-1">🕌 Pembukaan (Mukadimah)</h4>
            <p className="text-sm text-slate-700 whitespace-pre-line">{data.openingText}</p>
          </div>
        )}

        {/* QnA Detail */}
        {data.qnaDetail && (
          <div className="space-y-3">
            {data.qnaDetail.answerQuick && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <h4 className="text-xs font-bold text-emerald-700 mb-1">💡 Jawaban Instan</h4>
                <p className="text-sm text-slate-700">{data.qnaDetail.answerQuick}</p>
              </div>
            )}
            {(data.qnaDetail.dialogBlocks || []).map((d: any, i: number) => (
              <div key={i} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <h4 className="text-xs font-bold text-amber-700 mb-1">💬 Dialog {i + 1}</h4>
                {(d.lines || []).map((line: any, li: number) => (
                  <p key={li} className="text-sm text-slate-700"><span className="font-semibold">{line.role}:</span> {line.text}</p>
                ))}
              </div>
            ))}
            {(data.qnaDetail.dalilBlocks || []).map((d: any, i: number) => (
              <div key={i} className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                <h4 className="text-xs font-bold text-orange-700 mb-1">📖 Dalil {i + 1}</h4>
                {(d.entries || []).map((e: any, ei: number) => (
                  <div key={ei} className="text-sm">
                    {e.arabic && <p className="text-right font-arabic text-lg text-slate-800 mb-1">{e.arabic}</p>}
                    {e.translation && <p className="text-slate-600 italic">{e.translation}</p>}
                    {e.source && <p className="text-xs text-slate-400 mt-1">Sumber: {e.source}</p>}
                  </div>
                ))}
              </div>
            ))}
            {(data.qnaDetail.analogyBlocks || []).map((a: any, i: number) => (
              <div key={i} className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                <h4 className="text-xs font-bold text-teal-700 mb-1">🧩 Analogi</h4>
                {a.title && <p className="text-sm font-semibold text-slate-800">{a.title}</p>}
                <p className="text-sm text-slate-700">{a.text}</p>
              </div>
            ))}
            {(data.qnaDetail.tipsBlocks || []).map((t: any, i: number) => (
              <div key={i} className="bg-sky-50 border border-sky-100 rounded-xl p-3">
                <h4 className="text-xs font-bold text-sky-700 mb-1">ℹ️ Tips</h4>
                <p className="text-sm text-slate-700">{t.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Article Detail */}
        {data.articleDetail?.blocks && (
          <div className="space-y-3">
            {(data.articleDetail.blocks as any[]).map((block: any, i: number) => (
              <div key={i} className="bg-white border border-slate-100 rounded-xl p-3">
                <span className="text-[10px] font-bold uppercase text-slate-400">{block.type}</span>
                {block.type === 'paragraph' && <p className="text-sm text-slate-700 mt-1">{block.text}</p>}
                {block.type === 'image' && block.url && <img src={block.url} alt={block.caption || ''} className="rounded-lg max-h-48 mt-1" />}
                {block.type === 'video' && block.url && <p className="text-sm text-blue-600 mt-1">{block.url}</p>}
                {block.text && block.type !== 'paragraph' && <p className="text-sm text-slate-700 mt-1">{block.text}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Closing / Penutupan */}
        {data.closingText && (
          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3">
            <h4 className="text-xs font-bold text-amber-700 mb-1">🤲 Penutupan</h4>
            <p className="text-sm text-slate-700 whitespace-pre-line">{data.closingText}</p>
          </div>
        )}

        {/* Review History */}
        {data.reviewHistory?.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Riwayat Review</h4>
            <div className="space-y-1">
              {data.reviewHistory.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                  <span className={`px-1.5 py-0.5 rounded font-bold ${
                    r.action === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                    r.action === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{r.action}</span>
                  <span>{r.reviewer?.name || 'Unknown'}</span>
                  <span>• {new Date(r.createdAt).toLocaleDateString('id-ID')}</span>
                  {r.notes && <span className="text-slate-400">— {r.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) return <div className="p-8">Memuat antrean...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Review Konten</h1>
        <p className="text-slate-500">Periksa konten dari AUTHOR sebelum dipublikasikan.</p>
      </div>

      <div className="space-y-4">
        {queue.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">{item.title}</h3>
                  <p className="text-sm text-slate-500">Oleh: <span className="font-medium text-slate-700">{item.author?.name || 'Unknown'}</span> • Tipe: {item.type} • Usia: {(item.ageGroups || []).join(', ')}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.aiCheckResults?.[0]?.score != null && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      item.aiCheckResults[0].score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      item.aiCheckResults[0].score >= 60 ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      AI: {item.aiCheckResults[0].score}/100
                    </span>
                  )}
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <AlertCircle size={14} /> Menunggu Review
                  </span>
                </div>
              </div>

              {/* Preview Toggle Button */}
              <button
                onClick={() => togglePreview(item.id)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 transition-colors mb-4"
              >
                <Eye size={16} />
                {expandedPreview === item.id ? 'Sembunyikan Konten' : 'Lihat Isi Konten'}
                {expandedPreview === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showNotesFor === item.id ? (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Catatan untuk AUTHOR ({actionType === 'approve' ? 'Opsional' : 'Wajib'})
                    </label>
                    <textarea
                      value={activeNotes}
                      onChange={(e) => setActiveNotes(e.target.value)}
                      placeholder="Tambahkan alasan atau saran perbaikan..."
                      className="w-full border-slate-300 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                    />
                  </div>

                  {/* Point Adjustment Section */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Penyesuaian Poin (Opsional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={pointAdjustment}
                        onChange={(e) => setPointAdjustment(parseInt(e.target.value) || 0)}
                        className="w-28 border-slate-300 rounded-lg p-2 text-sm text-center focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-400">
                        Positif = bonus, Negatif = penalti
                      </span>
                    </div>
                    {pointAdjustment !== 0 && (
                      <div>
                        <input
                          type="text"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="Alasan penyesuaian poin (wajib)..."
                          className="w-full border-slate-300 rounded-lg p-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <p className={`mt-1 text-xs font-semibold ${pointAdjustment > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {pointAdjustment > 0 ? `+${pointAdjustment} poin bonus` : `${pointAdjustment} poin penalti`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowNotesFor(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => submitAction(item.id)}
                      disabled={processingId === item.id || (actionType !== 'approve' && !activeNotes.trim()) || (pointAdjustment !== 0 && adjustmentReason.trim().length < 3)}
                      className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors disabled:opacity-50 ${
                        actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' :
                        actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' :
                        'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {processingId === item.id ? "Memproses..." : "Konfirmasi"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => handleActionClick(item.id, 'approve')}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Check size={16} /> Setujui (Publish)
                  </button>
                  <button
                    onClick={() => handleActionClick(item.id, 'revision')}
                    className="flex items-center gap-1 px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Edit2 size={16} /> Minta Revisi
                  </button>
                  <button
                    onClick={() => handleActionClick(item.id, 'reject')}
                    className="flex items-center gap-1 px-4 py-2 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-sm font-bold transition-colors"
                  >
                    <X size={16} /> Tolak
                  </button>
                  <a
                    href={`/admin/editor?id=${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-bold transition-colors ml-auto"
                  >
                    <ExternalLink size={16} /> Buka di Editor
                  </a>
                </div>
              )}
            </div>

            {/* Expandable Content Preview */}
            {expandedPreview === item.id && (
              loadingPreview === item.id ? (
                <div className="border-t border-slate-200 p-6 text-center text-sm text-slate-400 animate-pulse">Memuat isi konten...</div>
              ) : (
                renderPreview(previewData[item.id])
              )
            )}
          </div>
        ))}

        {queue.length === 0 && (
          <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="inline-flex h-16 w-16 bg-emerald-50 rounded-full items-center justify-center text-emerald-500 mb-4">
              <ClipboardCheck size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Hore! Antrean Kosong</h3>
            <p className="text-slate-500 mt-1">Tidak ada konten yang menunggu untuk direview saat ini.</p>
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {cropSrc && cropTarget && (
        <ImageCropperModal
          imageSrc={cropSrc}
          aspect={cropTarget.type === 'web' ? 16 / 9 : 1}
          title={cropTarget.type === 'web' ? 'Crop Thumbnail Web (16:9)' : 'Crop Thumbnail Sosmed (1:1)'}
          onCancel={() => { if (cropSrc) URL.revokeObjectURL(cropSrc); setCropSrc(null); setCropTarget(null); }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
