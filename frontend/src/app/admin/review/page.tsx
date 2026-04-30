"use client";

import { useState, useEffect } from "react";
import { fetchReviewQueue, processReview } from "@/lib/api";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { ClipboardCheck, Check, X, Edit2, AlertCircle } from "lucide-react";

export default function ReviewPage() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState("");
  const [showNotesFor, setShowNotesFor] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'revision' | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      const response = await fetchReviewQueue(token);
      setQueue(response.data || []);
    } catch (error) {
      toast.error("Gagal memuat antrean review");
    } finally {
      setIsLoading(false);
    }
  };

  const handleActionClick = (id: string, action: 'approve' | 'reject' | 'revision') => {
    setShowNotesFor(id);
    setActionType(action);
    setActiveNotes("");
  };

  const submitAction = async (id: string) => {
    if (!actionType) return;
    setProcessingId(id);
    try {
      const token = Cookies.get("access_token");
      if (!token) return;
      await processReview(id, actionType, activeNotes, token);
      toast.success(`Konten berhasil di-${actionType}`);
      setShowNotesFor(null);
      loadQueue(); // Reload queue
    } catch (error: any) {
      toast.error(error.message || "Gagal memproses review");
    } finally {
      setProcessingId(null);
    }
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
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
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

            {showNotesFor === item.id ? (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Catatan untuk AUTHOR ({actionType === 'approve' ? 'Opsional' : 'Wajib'})
                </label>
                <textarea 
                  value={activeNotes}
                  onChange={(e) => setActiveNotes(e.target.value)}
                  placeholder="Tambahkan alasan atau saran perbaikan..."
                  className="w-full border-slate-300 rounded-lg p-3 text-sm focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px] mb-3"
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setShowNotesFor(null)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={() => submitAction(item.id)}
                    disabled={processingId === item.id || (actionType !== 'approve' && !activeNotes.trim())}
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
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
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
              </div>
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
    </div>
  );
}
