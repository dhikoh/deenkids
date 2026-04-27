"use client";

import { useState } from "react";
import { CheckCircle, Save, Sparkles, AlertCircle, Plus, Trash2, ArrowRight } from "lucide-react";

export default function EditorPage() {
  const [title, setTitle] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [dialogBlocks, setDialogBlocks] = useState([{ role: "anak", text: "" }]);
  
  const addDialog = (role: "anak" | "ortu") => {
    setDialogBlocks([...dialogBlocks, { role, text: "" }]);
  };

  const updateDialog = (index: number, text: string) => {
    const newBlocks = [...dialogBlocks];
    newBlocks[index].text = text;
    setDialogBlocks(newBlocks);
  };

  const removeDialog = (index: number) => {
    setDialogBlocks(dialogBlocks.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Block Editor CMS</h1>
          <p className="text-slate-500">Buat konten interaktif dengan format Dialog, Dalil, dan Analogi.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <input 
              type="checkbox" 
              checked={useAi} 
              onChange={(e) => setUseAi(e.target.checked)}
              className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
            />
            <span className="text-sm font-medium flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-amber-500" />
              AI Checker (Manhaj)
            </span>
          </label>
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2">
            <Save size={18} /> Simpan Draft
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Block */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Informasi Utama</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Judul Pertanyaan (QnA)</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Apakah Allah melihat saat aku sembunyi?"
                  className="w-full border-slate-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kurikulum</label>
                  <select className="w-full border-slate-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                    <option>Tauhid > Mengenal Allah</option>
                    <option>Adab > Adab Tidur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kelompok Usia</label>
                  <select className="w-full border-slate-300 rounded-lg shadow-sm focus:border-emerald-500 focus:ring-emerald-500">
                    <option>3-5 Tahun</option>
                    <option>5-7 Tahun</option>
                    <option>7-10 Tahun</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Dialog Block Builder */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-lg font-bold text-slate-800">Skrip Dialog Interaktif</h2>
              <div className="flex gap-2">
                <button onClick={() => addDialog("anak")} className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold hover:bg-amber-200 transition-colors flex items-center gap-1">
                  <Plus size={14} /> Anak
                </button>
                <button onClick={() => addDialog("ortu")} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1">
                  <Plus size={14} /> Orang Tua
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {dialogBlocks.map((block, index) => (
                <div key={index} className={`flex gap-3 p-3 rounded-xl border ${block.role === 'anak' ? 'bg-amber-50/50 border-amber-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${block.role === 'anak' ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                    {block.role === 'anak' ? '👦' : '🧔'}
                  </div>
                  <div className="flex-1 relative">
                    <textarea 
                      value={block.text}
                      onChange={(e) => updateDialog(index, e.target.value)}
                      placeholder={block.role === 'anak' ? 'Ketik pertanyaan anak di sini...' : 'Ketik jawaban orang tua di sini...'}
                      className="w-full border-slate-200 rounded-lg text-sm p-3 min-h-[80px] focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                    />
                    <button onClick={() => removeDialog(index)} className="absolute top-2 right-2 text-slate-400 hover:text-rose-500 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {dialogBlocks.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                  Belum ada percakapan. Klik tombol tambah di atas.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Status / AI Feedback */}
        <div className="space-y-6">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="text-amber-400" size={24} />
              <h3 className="font-bold text-lg">AI Assistant (Preview)</h3>
            </div>
            {useAi ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  AI akan secara otomatis memvalidasi tulisan Anda saat disimpan untuk memastikan kesesuaian dengan manhaj dan usia anak.
                </p>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400 font-medium">Dalil Accuracy</span>
                    <span className="text-xs text-emerald-400 font-bold">100%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 mb-4">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                  
                  <div className="flex items-start gap-2 text-amber-300 text-xs mt-3 bg-amber-500/10 p-2 rounded-lg">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    <p>Saran: Kurangi bahasa kiasan untuk usia 3-5 tahun agar lebih mudah dipahami.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-6 bg-slate-800 rounded-xl text-slate-400 text-sm">
                AI Checker dinonaktifkan. Anda bertanggung jawab penuh atas kualitas tulisan.
              </div>
            )}
          </div>
          
          {/* Action Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Publikasi</h3>
             <ul className="space-y-3 mb-6">
               <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-emerald-500"/> Status: Draft</li>
               <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300"/> Validasi AI: Belum dicek</li>
               <li className="flex items-center gap-2 text-sm text-slate-600"><CheckCircle size={16} className="text-slate-300"/> Persetujuan: Menunggu</li>
             </ul>
             <button className="w-full bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2">
                Kirim untuk Direview <ArrowRight size={16} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
