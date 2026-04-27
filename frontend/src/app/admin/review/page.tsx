"use client";

import { useState } from "react";
import { Check, X, AlertCircle, Edit, ExternalLink, Filter } from "lucide-react";
import Link from "next/link";

export default function AdminReviewPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  const pendingReviews = [
    { id: 1, title: "Kisah Sahabat Nabi: Umar bin Khattab", author: "Ahmad", date: "2 jam yang lalu", aiScore: 92, aiNotes: "Sangat baik. Dalil akurat.", status: "PENDING" },
    { id: 2, title: "Adab Makan Menurut Sunnah", author: "Fatimah", date: "5 jam yang lalu", aiScore: 88, aiNotes: "Gunakan bahasa yang lebih sederhana untuk usia 3-5.", status: "PENDING" },
    { id: 3, title: "Kenapa Kita Harus Shalat?", author: "Budi", date: "1 hari yang lalu", aiScore: 65, aiNotes: "Terlalu banyak kiasan filosofis, tidak cocok untuk anak kecil.", status: "PENDING" },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Antrean Review Konten</h1>
          <p className="text-slate-500">Periksa dan setujui draf konten dari Editor sebelum dipublikasi.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab("pending")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Menunggu (3)
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Riwayat
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
            <Filter size={16} /> Filter: Semua Kategori
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {pendingReviews.map((item) => (
            <div key={item.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded">QnA</span>
                  <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>👤 {item.author}</span>
                  <span>🕒 {item.date}</span>
                </div>
                
                {/* AI Review Snippet */}
                <div className="mt-4 bg-slate-100 p-3 rounded-xl border border-slate-200 flex gap-4 items-start">
                  <div className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[60px] ${
                    item.aiScore >= 90 ? 'bg-emerald-100 text-emerald-700' : 
                    item.aiScore >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    <span className="text-xs font-bold uppercase">AI Score</span>
                    <span className="text-lg font-black">{item.aiScore}</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-bold text-slate-700 mb-1">Catatan AI Validator:</p>
                    <p className="text-sm text-slate-600">{item.aiNotes}</p>
                  </div>
                </div>
              </div>

              <div className="flex lg:flex-col gap-2 shrink-0">
                <Link href={`/admin/editor?id=${item.id}`} className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-sm transition-colors w-full">
                  <ExternalLink size={16} /> Pratinjau
                </Link>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-colors w-full">
                  <Check size={16} /> Setujui
                </button>
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl font-bold text-sm transition-colors w-full">
                  <Edit size={16} /> Revisi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
